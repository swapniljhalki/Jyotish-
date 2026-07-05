/**
 * Client-side DOM → DOCX exporter.
 *
 * Design goals
 * ------------
 * • Zero backend round-trip — the same DOM already rendered on-screen is what
 *   ends up in the Word doc.
 * • Full charts / banners / watermarks preserved as inline PNGs (base64) so
 *   the doc opens cleanly in Word, Google Docs, Pages, LibreOffice — no
 *   external image fetches, no broken links.
 * • Content stays fully editable — headings, paragraphs and tables land as
 *   real Word structures (not one big image), so the user can tweak the
 *   reading before sharing.
 *
 * How it works
 * ------------
 * 1. Clone the printable node so we can mutate freely without affecting the
 *    live DOM.
 * 2. Walk every SVG (Kundali / Chandra / Navamsha charts, ornate dividers)
 *    and every canvas — rasterize each to a PNG data-URL via html-to-image
 *    and swap it in as an <img>. Word can't render SVG/canvas but happily
 *    renders inline PNGs.
 * 3. Convert every <img> whose src is a same-origin file (Ganesha banner,
 *    SNW logo) or an external URL to a base64 data-URL so the docx has
 *    zero network dependencies.
 * 4. Strip anything Word can't render (no-print action buttons, hover
 *    tooltips, CSS variables that Word discards silently).
 * 5. Pass the sanitised outerHTML to @turbodocx/html-to-docx which returns
 *    a Blob → saved via file-saver.
 */
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import HtmlToDocx from "@turbodocx/html-to-docx";

// ---------- image helpers ----------------------------------------------------

/** Resolve a URL to a base64 data-URL. Works for same-origin (bundled) assets
 * and any CORS-allowed remote images. On failure we return the original src
 * so the docx still validates — the image will just render as an X icon in
 * Word, which is preferable to breaking the whole export. */
async function urlToDataUrl(url) {
  if (!url || url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { credentials: "omit", mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("[exportDocx] image inline failed for", url, e);
    return url;
  }
}

/** Rasterize any element (SVG, canvas, arbitrary DOM subtree) to a PNG
 * data-URL. Used for charts that Word can't render natively. */
async function rasterizeToImg(el) {
  const rect = el.getBoundingClientRect();
  // Fall back to 400×400 for zero-size charts (should never happen but…).
  const w = Math.max(1, Math.round(rect.width  || 400));
  const h = Math.max(1, Math.round(rect.height || 400));
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust:  true,
    backgroundColor: "#FFFFFF",
    width: w,
    height: h,
    style: { width: `${w}px`, height: `${h}px` },
  });
  const img = document.createElement("img");
  img.src = dataUrl;
  img.width  = w;
  img.height = h;
  img.style.display = "block";
  img.style.margin  = "8px auto";
  img.style.maxWidth = "100%";
  return img;
}

// ---------- clone + sanitize -------------------------------------------------

/** Deep-clone `node` and prepare it for html-to-docx consumption. */
async function prepareForDocx(node) {
  const clone = node.cloneNode(true);
  // Move it off-screen so we can still measure sizes on the original when
  // rasterizing — clone itself is not measured, we measure the LIVE nodes.
  clone.style.position = "absolute";
  clone.style.left     = "-99999px";
  clone.style.top      = "0";
  clone.style.width    = `${node.offsetWidth}px`;
  document.body.appendChild(clone);

  try {
    // 1. Drop everything marked .no-print (buttons, share toggles, etc.)
    clone.querySelectorAll(".no-print").forEach((el) => el.remove());

    // 2. Replace every SVG in the clone with a PNG rasterized from the
    //    corresponding LIVE SVG (same index / same order) — the live one has
    //    valid layout dimensions, the clone's SVG may not.
    const liveSvgs  = Array.from(node.querySelectorAll("svg"));
    const cloneSvgs = Array.from(clone.querySelectorAll("svg"));
    for (let i = 0; i < cloneSvgs.length; i++) {
      const liveSvg  = liveSvgs[i];
      const cloneSvg = cloneSvgs[i];
      if (!liveSvg || !cloneSvg) continue;
      try {
        const img = await rasterizeToImg(liveSvg);
        cloneSvg.replaceWith(img);
      } catch (e) {
        console.warn("[exportDocx] SVG rasterize failed at index", i, e);
      }
    }

    // 3. Same treatment for <canvas> elements.
    const liveCanvases  = Array.from(node.querySelectorAll("canvas"));
    const cloneCanvases = Array.from(clone.querySelectorAll("canvas"));
    for (let i = 0; i < cloneCanvases.length; i++) {
      const liveEl  = liveCanvases[i];
      const cloneEl = cloneCanvases[i];
      if (!liveEl || !cloneEl) continue;
      try {
        const dataUrl = liveEl.toDataURL("image/png");
        const img = document.createElement("img");
        img.src = dataUrl;
        img.style.maxWidth = "100%";
        cloneEl.replaceWith(img);
      } catch (e) {
        console.warn("[exportDocx] canvas rasterize failed at index", i, e);
      }
    }

    // 4. Inline every <img src> as base64 so the docx has no network deps.
    //    This is what makes the file actually openable offline.
    const imgs = clone.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map(async (img) => {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) return;
        img.src = await urlToDataUrl(src);
      })
    );

    // 5. Word/html-to-docx choke on CSS variables and `background-image`
    //    gradients. Strip inline gradient backgrounds (they're purely
    //    decorative — the borders remain).
    clone.querySelectorAll("[style]").forEach((el) => {
      const s = el.getAttribute("style") || "";
      if (s.includes("gradient") || s.includes("var(--")) {
        // Drop the background* rule that has the gradient; keep the rest.
        const cleaned = s
          .split(";")
          .filter((rule) => !/background(-image)?\s*:\s*[^;]*gradient/i.test(rule))
          .filter((rule) => !rule.includes("var(--"))
          .join(";");
        el.setAttribute("style", cleaned);
      }
    });

    return clone.outerHTML;
  } finally {
    clone.remove();
  }
}

// ---------- public entry point ----------------------------------------------

/**
 * Render `node` to a downloadable .docx and trigger the browser download.
 *
 * @param {HTMLElement} node — root DOM node whose contents become the doc
 * @param {string} filename  — file name (with or without .docx extension)
 */
export async function downloadNodeAsDocx(node, filename) {
  const html = await prepareForDocx(node);

  const wrapped = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${filename}</title>
      </head>
      <body>${html}</body>
    </html>`;

  const buffer = await HtmlToDocx(wrapped, null, {
    orientation: "portrait",
    margins: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5" all round
    title: filename,
    pageNumber: true,
    font: "Georgia",
  });

  const name = filename.toLowerCase().endsWith(".docx") ? filename : `${filename}.docx`;
  // Some builds of html-to-docx return a Blob directly, others return an
  // ArrayBuffer / Buffer — normalise before saving.
  const blob = buffer instanceof Blob
    ? buffer
    : new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  saveAs(blob, name);
}

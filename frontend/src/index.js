import React from "react";
import ReactDOM from "react-dom/client";
// Polyfill Node's `Buffer` global — @turbodocx/html-to-docx (used by our
// Word-export flow) references `Buffer` when embedding inline PNGs. Without
// this shim the docx opens fine but has no charts / images inside it.
import { Buffer } from "buffer";
import "@/index.css";
import App from "@/App";

if (!window.Buffer) window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

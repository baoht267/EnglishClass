const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "frontend", "src", "pages", "admin", "Questions.jsx");
const code = fs.readFileSync(filePath, "utf8");

let line = 1;
let col = 0;
let inS = false;
let inD = false;
let inB = false;
let inLine = false;
let inBlock = false;
let esc = false;
let paren = 0;
const stack = [];
let firstExtra = null;

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  const next = code[i + 1];

  if (ch === "\n") {
    line += 1;
    col = 0;
    inLine = false;
    continue;
  }
  col += 1;

  if (inLine) continue;
  if (inBlock) {
    if (ch === "*" && next === "/") {
      inBlock = false;
      i += 1;
      col += 1;
    }
    continue;
  }
  if (inS) {
    if (!esc && ch === "\\") esc = true;
    else {
      if (!esc && ch === "'") inS = false;
      esc = false;
    }
    continue;
  }
  if (inD) {
    if (!esc && ch === "\\") esc = true;
    else {
      if (!esc && ch === "\"") inD = false;
      esc = false;
    }
    continue;
  }
  if (inB) {
    if (!esc && ch === "\\") esc = true;
    else {
      if (!esc && ch === "`") inB = false;
      esc = false;
    }
    continue;
  }

  if (ch === "/" && next === "/") {
    inLine = true;
    i += 1;
    col += 1;
    continue;
  }
  if (ch === "/" && next === "*") {
    inBlock = true;
    i += 1;
    col += 1;
    continue;
  }
  if (ch === "'") {
    inS = true;
    continue;
  }
  if (ch === "\"") {
    inD = true;
    continue;
  }
  if (ch === "`") {
    inB = true;
    continue;
  }

  if (ch === "(") {
    paren += 1;
    stack.push({ line, col });
  } else if (ch === ")") {
    paren -= 1;
    if (paren < 0 && !firstExtra) {
      firstExtra = { line, col };
    }
  }
}

console.log("paren_balance", paren);
if (stack.length) {
  const last = stack[stack.length - 1];
  console.log("last_open_paren", last.line + ":" + last.col);
}
if (firstExtra) {
  console.log("first_extra_close_paren", firstExtra.line + ":" + firstExtra.col);
}

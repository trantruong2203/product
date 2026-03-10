const text = `
## 1️⃣ Official Website
1. **Nike** is good
2) _Adidas_ is ok
[3] Puma
### 4. Bitis
10. Reebok
`;
const pattern =
  /^(?:#+\s*)?\[?(\d+)[.)\]\uFE0F\u20E3]*\s+(?:[*_]+)?([^\n*_:\-\[]+)/gm;
let m;
while ((m = pattern.exec(text)) !== null) {
  console.log(m[1], ":", m[2].trim());
}

import { detectBrandMentions } from "./src/utils/parser.js";
const text = `1. **Apple** - Best tech company.
2. Microsoft - Also great.
3. Apple is mentioned again [1].
`;
console.log(detectBrandMentions(text, "Apple", "apple.com"));

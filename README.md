# OBSERVATORY
### Interactive Expression Processing & Evaluation Laboratory

A full-stack Data Structures & Algorithms (DSA) educational platform built with a **React** developer-IDE interface and a **Java Spring Boot** backend implementing every expression-processing algorithm manually from first principles.

---

## Architecture

```
Frontend (React + Vite + Tailwind CSS + Motion, port 3000)
       │
       │  HTTP JSON (/api/* proxy via Express server.ts)
       ▼
Java Spring Boot REST API (port 8081)
       │
       ├── 1. Tokenizer.java             (Manual character-by-character lexical scan)
       ├── 2. ExpressionValidator.java   (Parentheses, unary classification, syntax & variable checks)
       ├── 3. ExpressionParser.java      (Manual Shunting Yard Infix → Postfix using Stack)
       ├── 4. ExpressionTreeBuilder.java (Binary Expression Tree construction & ASCII tree)
       └── 5. ExpressionEvaluator.java   (Manual stack-based postfix evaluation & trace recorder)
```

- **Single Source of Truth**: The frontend never evaluates expressions, builds syntax trees, or fabricates parsing traces in JavaScript. All tokenization, validation, Shunting Yard conversion, tree construction, and calculations run in Java and return structured JSON.
- **Zero Built-in Evaluators**: No `eval()`, `Function()`, `ScriptEngine`, regex tokenizers, or third-party math parsing libraries.

---

## Four Synchronized Laboratory Sections

1. **Section A — Expression Workspace**:
   - Interactive expression editor with `+`, `-`, `*`, `/`, unary minus (`-`), nested parentheses `(...)`, integers, decimals, and named variables (up to 2,000 tokens).
   - Toggleable mathematical keypad, live Java `HashMap<String, Double>` variable manager (add, edit, delete, reset, click-to-insert), 8-example library (including `-(a + b) * 2 + 30 / 5 = -24`), syntax validation, error position ruler, and `.txt` report export.
2. **Section B — Algorithm Simulator**:
   - Real-time 3-stage algorithm playback driven directly by Java execution steps:
     1. **Tokenization** (`UNARY_MINUS`, `LEFT_PARENTHESIS`, `VARIABLE(a)`, `PLUS`, `NUMBER(5)`, etc.)
     2. **Infix → Postfix (Shunting Yard)** with animated operator stack push/pop operations
     3. **Postfix Evaluation** with animated operand stack push/pop transitions and current operation inspection
   - Controls: Stage tabs, Reset, Previous, Play/Pause, Next, `0.5x / 1x / 2x` speed, and clickable step table.
3. **Section C — Expression Tree Explorer**:
   - Connected interactive SVG binary expression tree generated from Java (`expressionTree` and `textTree`), with distinct styling for binary operators, unary `NEG`, variables, and numbers.
   - Clickable nodes, branch expand/collapse, active evaluation node synchronization with the Simulator, bottom-up evaluation animation, Visual / Text Tree / Split modes, and Preorder / Inorder / Postorder traversals.
4. **Section D — Observatory CLI**:
   - Real Java-backed REPL inside the application supporting:
     `help`, `set`, `variables` (`vars`), `expr`, `tokenize`, `postfix`, `tree`, `run`, `step`, `history`, `compare`, and `clear`.
   - Includes Up/Down command history, Tab autocomplete, colored status output, persistent Java variable environment, and full workbench synchronization.

### Additional Labs
- **Comparison Lab**: Side-by-side comparison of Expression A vs Expression B (results, postfix forms, dual expression trees, execution traces, and precedence explanation).
- **Testing Lab**: Loads 21 normal and malformed test cases from Java (`GET /api/test/cases`), supports clicking any individual case to run (`POST /api/test`) or running the full suite (`POST /api/test/run-all`), plus 13 error diagnostic probes and a custom test runner.
- **History & Complexity**: Persistent calculation history with one-click reopen and an $O(n)$ time/space complexity guide.

---

## Installation & Execution

### Prerequisites
- Java 17+
- Apache Maven 3.8+
- Node.js 20+

### 1. Build and Test the Java Backend
```bash
mvn -f backend/pom.xml test package
```

### 2. Run the Full-Stack Application
```bash
npm install
npm run dev
```
`server.ts` launches the Spring Boot JAR on `127.0.0.1:8081`, proxies `/api/*` requests to it, and serves the frontend on port `3000`.

---

## REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/variables` | Retrieve all variables in Java `HashMap<String, Double>` |
| `POST` | `/api/variables` | Add or update a variable (`{ name, value, overwrite }`) |
| `PUT` | `/api/variables/{name}` | Update an existing variable value |
| `DELETE` | `/api/variables/{name}` | Remove a variable from the `HashMap` |
| `POST` | `/api/validate` | Validate syntax & variables without evaluating |
| `POST` | `/api/evaluate` | Tokenize, validate, convert to postfix, build tree, and evaluate expression |
| `POST` | `/api/compare` | Compare two expressions, postfix sequences, traces, and trees |
| `GET` | `/api/test/cases` | Retrieve the 21 predefined normal and malformed test cases |
| `POST` | `/api/test` | Run an isolated single test case against the engine |
| `POST` | `/api/test/run-all` | Execute the predefined verification suite against the engine |

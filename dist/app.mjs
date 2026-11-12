import {demo, proposals, requirements} from "./demo.mjs";
import {deployment} from "./config.mjs";
import {connect, price, receiptOutcome} from "./chain.mjs";

const field = id => document.getElementById(id);
const node = (tag, value, cls) => {
  const item = document.createElement(tag);
  if (value !== undefined) item.textContent = value;
  if (cls) item.className = cls;
  return item;
};
const notes = {
  INCLUDED:"Included", EXCLUDED:"Excluded", CONDITIONAL:"Conditional",
  MISSING:"Missing", PENDING:"Awaiting review"
};

function render({scope, quotes}, live) {
  field("mode").textContent = live ? "FINALIZED STUDIONET STATE" : "ILLUSTRATIVE SOLAR DEMO";
  field("title").textContent = scope.title;
  field("scope-meta").textContent = [scope.rfq, "v" + scope.version, scope.closed ? "Closed" : "Accepting quotes",
    quotes.length + (quotes.length === 1 ? " quote" : " quotes")].join(" · ");
  const matrix = field("matrix");
  const sources = field("sources");
  sources.replaceChildren();
  if (!quotes.length) {
    matrix.replaceChildren(node("p", "No signed quotes submitted for this version."));
    return;
  }
  const table = node("table");
  table.setAttribute("aria-label", "Vendor quote comparison");
  const heads = node("tr");
  const heading = node("th", "Scope requirement");
  heading.scope = "col";
  heads.append(heading);
  quotes.forEach((quote, i) => {
    const th = node("th");
    th.scope = "col";
    th.append(node("strong", quote.vendor), node("p", price(quote.price_minor, scope.currency) +
      (i === 0 && quotes.length > 1 && quote.price_minor < quotes[1].price_minor ? " · Lowest price" : "")));
    heads.append(th);
    const source = node("details");
    source.id = "quote-" + i;
    source.append(node("summary", quote.vendor + " · Quote text"));
    if (quote.signer) source.append(node("p", "Signer " + quote.signer));
    quote.lines.forEach((line, index) => {
      const row = node("div", (index + 1) + ". " + line, "source-line");
      row.id = "quote-" + i + "-line-" + (index + 1);
      source.append(row);
    });
    if (quote.quote_sha256) source.append(node("p", "Quote SHA-256 " + quote.quote_sha256));
    if (quote.review?.decision_sha256) source.append(node("p", "Decision SHA-256 " + quote.review.decision_sha256));
    sources.append(source);
  });
  const thead = node("thead");
  thead.append(heads);
  const tbody = node("tbody");
  scope.requirements.forEach((requirement, index) => {
    const row = node("tr");
    const label = node("th", requirement);
    label.scope = "row";
    row.append(label);
    quotes.forEach((quote, i) => {
      const [status, refs] = quote.review?.rows[index] ?? ["PENDING", []];
      const cell = node("td");
      cell.append(node("span", notes[status], "badge " + status.toLowerCase()));
      refs.forEach(ref => {
        const link = node("a", "Line " + ref + " · " + quote.lines[ref - 1], "cite");
        link.href = "#quote-" + i + "-line-" + ref;
        link.addEventListener("click", () => { field("quote-" + i).open = true; });
        cell.append(link);
      });
      row.append(cell);
    });
    tbody.append(row);
  });
  table.append(thead, tbody);
  matrix.replaceChildren(table);
}

function operation(id, callback, status) {
  field(id).addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter ?? field(id).querySelector("button");
    button.disabled = true;
    try { await callback(); }
    catch (error) { field(status).textContent = error.message; }
    finally { button.disabled = false; }
  });
}

let display = 0;
operation("read", async () => {
  const request = ++display;
  field("chain-status").textContent = "Reading finalized state…";
  const args = [field("rfq").value, Number(field("version").value)];
  const address = field("address").value;
  try {
    const {client, final} = await connect();
    const value = await client.readContract({address, functionName:"get_comparison", args, transactionHashVariant:final});
    if (request !== display) return;
    render(JSON.parse(value), true);
    field("chain-status").textContent = "Loaded finalized comparison for " + args.join(" / ") + ".";
  } catch (error) {
    if (request === display) throw error;
  }
}, "chain-status");
operation("track", async () => {
  const hash = field("hash").value;
  field("explorer").href = "https://explorer-studio.genlayer.com/tx/" + hash;
  field("explorer").hidden = false;
  field("receipt").textContent = "Looking up receipt…";
  const {client} = await connect();
  for (let i = 0; i < 12; i++) {
    const outcome = receiptOutcome(await client.getTransaction({hash}));
    field("receipt").textContent = [outcome.phase, outcome.status, outcome.result].filter(Boolean).join(" · ");
    if (outcome.phase !== "Pending") return;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  field("receipt").textContent = "Still pending. Use the same hash to resume tracking.";
}, "receipt");

const methodFields = {
  publish:[["RFQ title","text",demo.scope.title],["Currency","text","USD"],["Requirements, one per line","textarea",requirements.join("\n")]],
  submit_quote:[["Vendor name","text",proposals[0].vendor],["Price in minor units","number",proposals[0].price_minor],["Quote text, one clause per line","textarea",proposals[0].lines.join("\n")]],
  close:[],
  review:[["Vendor signer address","text",""]]
};

function showArguments() {
  const values = [...field("inputs").querySelectorAll("input,textarea")].map(element =>
    element.tagName === "TEXTAREA" ? JSON.stringify(element.value.split(/\r?\n/).filter(line => line.trim())) :
      element.type === "number" && element.value ? Number(element.value) : element.value);
  field("arguments").textContent = JSON.stringify([
    field("rfq").value, Number(field("version").value), ...values
  ], null, 2);
  field("copy-status").textContent = "";
}
function showInputs() {
  field("inputs").replaceChildren(...methodFields[field("method").value].map(([name, type, initial]) => {
    const label = node("label",name);
    const input = node(type === "textarea" ? type : "input");
    if (type !== "textarea") input.type = type;
    input.value = initial;
    input.addEventListener("input", showArguments);
    label.append(input);
    return label;
  }));
  showArguments();
}

field("address").value = deployment.address;
field("rfq").value = deployment.rfq;
field("version").value = deployment.version;
field("method").addEventListener("change", showInputs);
for (const id of ["rfq", "version"]) field(id).addEventListener("input", showArguments);
field("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(field("arguments").textContent);
    field("copy-status").textContent = "Copied.";
  } catch {
    field("copy-status").textContent = "Select and copy the arguments below.";
  }
});
field("demo").addEventListener("click", () => {
  display++;
  field("chain-status").textContent = "";
  render(demo, false);
});
showInputs();
render(demo, false);
if (deployment.address) field("read").requestSubmit();

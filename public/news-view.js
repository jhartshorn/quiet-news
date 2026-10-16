// Keep unchanged sections/cards alive, including expanded coverage and focus.
export function reconcileSections(container, entries, render, context) {
  const document = container.ownerDocument;
  const active = document.activeElement;
  const focusId = active?.dataset.id;
  const focusState = active?.dataset.state;
  const existing = new Map(
    [...container.children].map((node) => [node.id, node]),
  );
  const wanted = new Set(entries.map((entry) => entry[0]));
  for (const node of [...container.children])
    if (!wanted.has(node.id)) node.remove();
  entries.forEach((entry, position) => {
    const [id, , articles] = entry;
    const options = context(id);
    const signature = JSON.stringify([entry, options]);
    let node = existing.get(id);
    if (node?._newsSignature !== signature) {
      const oldCards = new Map(
        [...(node?.querySelectorAll(".card") || [])].map((card) => [
          card.dataset.articleId,
          card,
        ]),
      );
      const template = document.createElement("template");
      template.innerHTML = render(...entry);
      const replacement = template.content.firstElementChild;
      [...replacement.querySelectorAll(".card")].forEach((card, index) => {
        const article = articles[index];
        const cardSignature = JSON.stringify([article, options]);
        const old = oldCards.get(article.id);
        if (old?._newsSignature === cardSignature) card.replaceWith(old);
        else {
          if (
            old?.querySelector("details")?.open &&
            card.querySelector("details")
          )
            card.querySelector("details").open = true;
          card._newsSignature = cardSignature;
        }
      });
      replacement._newsSignature = signature;
      if (node) node.replaceWith(replacement);
      node = replacement;
    }
    if (container.children[position] !== node)
      container.insertBefore(node, container.children[position] || null);
  });
  if (focusId && focusState && document.activeElement !== active)
    [...container.querySelectorAll("button[data-state]")]
      .find(
        (button) =>
          button.dataset.id === focusId && button.dataset.state === focusState,
      )
      ?.focus();
}

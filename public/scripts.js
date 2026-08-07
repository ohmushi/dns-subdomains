document.querySelectorAll("[data-confirm-delete]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    const recordName = form.getAttribute("data-confirm-delete");

    if (!recordName || !window.confirm(`Supprimer ${recordName} ?`)) {
      event.preventDefault();
    }
  });
});


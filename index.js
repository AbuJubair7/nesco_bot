async function getData() {
  const num = document.getElementById("custNumber").value;
  const loader = document.getElementById("loading");
  const grid = document.getElementById("dynamicGrid");
  const tableWrapper = document.getElementById("tableWrapper");
  const tbody = document.getElementById("tableBody");
  const errorBox = document.getElementById("errorMessage");

  // Reset UI
  loader.style.display = "block";
  errorBox.style.display = "none";
  grid.innerHTML = "";
  tableWrapper.style.display = "none";
  tbody.innerHTML = "";
  const TARGET_URL = "https://nesco-custom-server-cmh9.onrender.com/"; // Replace with actual URL
  // const TARGET_URL = "http://localhost:3000/"; // local testing
  try {
    // Attempt Fetch
    const req = await fetch(`${TARGET_URL}get-history?number=${num}`);

    if (!req.ok) {
      throw new Error(`Server returned status: ${req.status}`);
    }

    const res = await req.json();

    if (res.success) {
      // 1. GENERATE INFO CARDS
      res.details.forEach((item) => {
        const card = document.createElement("div");
        card.className = "info-card";

        // Highlight Balance or Name
        if (
          item.label.includes("ব্যালেন্স") ||
          item.label.includes("Balance")
        ) {
          card.classList.add("highlight-card");
        }

        card.innerHTML = `
                        <label>${item.label}</label>
                        <span>${item.value}</span>
                    `;
        grid.appendChild(card);
      });

      // 2. FILL TABLE
      res.history.forEach((row) => {
        const tr = document.createElement("tr");

        // Badge Logic
        const statusClass = row.status.toLowerCase().includes("success")
          ? "badge-success"
          : "badge-failed";

        tr.innerHTML = `
                        <td>${row.date}</td>
                        <td style="font-weight:bold; color: white;">${row.amount}</td>
                        <td class="token-font">${row.token}</td>
                        <td>${row.medium}</td>
                        <td><span class="badge ${statusClass}">${row.status}</span></td>
                    `;
        tbody.appendChild(tr);
      });

      tableWrapper.style.display = "block";
    } else {
      showError("No data found for this consumer number.");
    }
  } catch (error) {
    console.error(error);
    showError(
      "Connection Failed! Make sure 'node server.js' is running in the terminal."
    );
  } finally {
    loader.style.display = "none";
  }
}

function showError(msg) {
  const box = document.getElementById("errorMessage");
  box.textContent = msg;
  box.style.display = "block";
}

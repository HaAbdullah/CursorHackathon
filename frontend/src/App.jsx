import { useEffect, useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("checking backend...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(() => setStatus("backend connected"))
      .catch(() => setStatus("backend not reachable"));
    loadItems();
  }, []);

  function loadItems() {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  }

  async function addItem(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    loadItems();
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "40px auto" }}>
      <h1>CursorHackathon</h1>
      <p>Status: {status}</p>

      <form onSubmit={addItem} style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item"
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

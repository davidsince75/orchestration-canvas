export function SchemaEditor({ schema, onChange }) {
  const pairs = Object.entries(schema || {});

  const update = (idx, field, value) => {
    const next = pairs.map((p, i) =>
      i === idx ? (field === 'key' ? [value, p[1]] : [p[0], value]) : p
    );
    onChange(Object.fromEntries(next));
  };

  return (
    <div>
      <div className="schema-rows">
        {pairs.map(([k, v], i) => (
          <div key={i} className="schema-row">
            <input className="schema-key" value={k} placeholder="key"
              onChange={e => update(i, 'key', e.target.value)} />
            <input className="schema-val" value={v} placeholder="type / description"
              onChange={e => update(i, 'val', e.target.value)} />
            <button className="schema-del" onClick={() => onChange(Object.fromEntries(pairs.filter((_, j) => j !== i)))} title="Remove">×</button>
          </div>
        ))}
      </div>
      <button className="schema-add-btn" onClick={() => onChange({ ...(schema || {}), '': '' })}>+ add field</button>
    </div>
  );
}

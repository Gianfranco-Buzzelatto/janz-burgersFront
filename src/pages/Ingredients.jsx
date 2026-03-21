import { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const fmt = n => `$${Number(n || 0).toLocaleString('es-AR')}`;
const fmtDec = n => `$${Number(n || 0).toFixed(2)}`;

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [newIng, setNewIng] = useState({ name: '', unit: '', packageUnit: '', quantityPerPackage: 1, packageCost: 0, category: 'Almacén', perishable: false, priority: 'B' });
  const [priceAlert, setPriceAlert] = useState(null);

  const fetchIngredients = () => {
    API.get('/ingredients').then(r => setIngredients(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchIngredients(); }, []);

  const startEdit = (ing) => {
    setEditing(ing._id);
    setEditValues({ packageCost: ing.packageCost, quantityPerPackage: ing.quantityPerPackage });
  };

  const saveEdit = async (ingId) => {
    try {
      const res = await API.put(`/ingredients/${ingId}`, editValues);
      setIngredients(prev => prev.map(i => i._id === ingId ? res.data.ingredient : i));
      setEditing(null);
      
      if (res.data.pricesRecalculated && res.data.affectedProducts?.length > 0) {
        setPriceAlert(res.data.affectedProducts);
        toast.success(`💰 ${res.data.affectedProducts.length} productos recalculados automáticamente`);
      } else {
        toast.success('Ingrediente actualizado');
      }
    } catch { toast.error('Error al actualizar'); }
  };

  const handleCreate = async () => {
    try {
      const res = await API.post('/ingredients', newIng);
      setIngredients(prev => [...prev, res.data]);
      setShowModal(false);
      setNewIng({ name: '', unit: '', packageUnit: '', quantityPerPackage: 1, packageCost: 0, category: 'Almacén', perishable: false, priority: 'B' });
      toast.success('Ingrediente creado');
      
      // Also create stock entry
      await API.post('/stock', { ingredient: res.data._id, currentStock: 0, minimumStock: 0, unit: res.data.unit });
    } catch { toast.error('Error al crear ingrediente'); }
  };

  const grouped = ingredients.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1>Ingredientes y Costos</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16}/>Nuevo Ingrediente</button>
      </div>
      <div className="page-body">
        {priceAlert && (
          <div className="alert alert-warning" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontWeight: 700 }}>
              <AlertTriangle size={16}/> Precios Actualizados Automáticamente
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              {priceAlert.map(p => (
                <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 6 }}>
                  <span>{p.name}</span>
                  <span>Costo: {fmt(p.previousCost)} → <strong style={{ color: 'var(--gold)' }}>{fmt(p.newCost)}</strong> | Precio sugerido: <strong>{fmt(p.suggestedPrice)}</strong></span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setPriceAlert(null)}>Cerrar</button>
          </div>
        )}

        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}/></div> : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--gold)', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                {category}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Unidad Compra</th>
                      <th>Cant./Paquete</th>
                      <th>Costo Paquete</th>
                      <th>Costo/Unidad</th>
                      <th>Prioridad</th>
                      <th>Perecedero</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(ing => (
                      <tr key={ing._id}>
                        <td><strong>{ing.name}</strong></td>
                        <td className="text-sm text-gray">{ing.packageUnit || ing.unit}</td>
                        <td>{ing.quantityPerPackage}</td>
                        <td>
                          {editing === ing._id ? (
                            <input type="number" value={editValues.packageCost}
                              onChange={e => setEditValues(v => ({ ...v, packageCost: Number(e.target.value) }))}
                              style={{ width: 110 }} min={0} />
                          ) : <strong>{fmt(ing.packageCost)}</strong>}
                        </td>
                        <td className="text-gold">{fmtDec(ing.costPerUnit)}</td>
                        <td><span className={`badge badge-${ing.priority}`}>{ing.priority}</span></td>
                        <td>{ing.perishable ? '✓' : '—'}</td>
                        <td>
                          {editing === ing._id ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-icon" onClick={() => saveEdit(ing._id)} style={{ color: 'var(--green)' }}><Check size={14}/></button>
                              <button className="btn-icon" onClick={() => setEditing(null)} style={{ color: 'var(--red)' }}><X size={14}/></button>
                            </div>
                          ) : (
                            <button className="btn-icon" onClick={() => startEdit(ing)}><Edit2 size={14}/></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Nuevo Ingrediente</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={newIng.name} onChange={e => setNewIng(n => ({ ...n, name: e.target.value }))} placeholder="ej: Carne picada" />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={newIng.category} onChange={e => setNewIng(n => ({ ...n, category: e.target.value }))}>
                    {['Proteína', 'Lácteos', 'Verduras', 'Almacén', 'Salsas', 'Descartables'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidad de medida</label>
                  <input value={newIng.unit} onChange={e => setNewIng(n => ({ ...n, unit: e.target.value }))} placeholder="g, ml, unidad..." />
                </div>
                <div className="form-group">
                  <label>Unidad de compra</label>
                  <input value={newIng.packageUnit} onChange={e => setNewIng(n => ({ ...n, packageUnit: e.target.value }))} placeholder="kg, litro, paquete x50..." />
                </div>
                <div className="form-group">
                  <label>Cantidad por paquete</label>
                  <input type="number" value={newIng.quantityPerPackage} onChange={e => setNewIng(n => ({ ...n, quantityPerPackage: Number(e.target.value) }))} min={1} />
                </div>
                <div className="form-group">
                  <label>Costo del paquete ($)</label>
                  <input type="number" value={newIng.packageCost} onChange={e => setNewIng(n => ({ ...n, packageCost: Number(e.target.value) }))} min={0} />
                </div>
                <div className="form-group">
                  <label>Prioridad ABC</label>
                  <select value={newIng.priority} onChange={e => setNewIng(n => ({ ...n, priority: e.target.value }))}>
                    <option value="A">A - Crítico</option>
                    <option value="B">B - Importante</option>
                    <option value="C">C - Secundario</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="perishable" checked={newIng.perishable} onChange={e => setNewIng(n => ({ ...n, perishable: e.target.checked }))} style={{ width: 'auto' }} />
                  <label htmlFor="perishable" style={{ margin: 0 }}>Es perecedero</label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Crear Ingrediente</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

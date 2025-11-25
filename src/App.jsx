import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, X, Menu, Search, Star, Instagram, Facebook, Minus, Plus, Trash2, ChevronDown, Copy, Edit, CheckCircle, AlertTriangle, Package, Truck, User, MapPin, Calendar, ClipboardList, Settings, Image as ImageIcon, ChevronLeft, ChevronRight, Globe, Layout, Lock, Link as LinkIcon, LogOut, Database, CreditCard, ArrowRight, Loader2, Phone, ShieldCheck } from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore'; 
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- CONFIGURACIÓN DE FIREBASE ---
        apiKey: "AIzaSyCKIQCKgUmGKTs8VtTBnbZ3L89M7TM0hV4",
      authDomain: "project-6852396288823438226.firebaseapp.com",
      projectId: "project-6852396288823438226",
      storageBucket: "project-6852396288823438226.firebasestorage.app",
      messagingSenderId: "1082758216100",
      appId: "1:1082758216100:web:d40c2a0f7380ef3c7c6931",
      measurementId: "G-2DG5P6GLNG"

let app, auth, db;

if (Object.keys(firebaseConfig).length > 0 && typeof window !== 'undefined') {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e) {
        console.error("Error al inicializar Firebase:", e);
    }
}
// --- FIN CONFIGURACIÓN DE FIREBASE ---

// --- DATOS DE EJEMPLO (SEED DATA) ---
const SAMPLE_PRODUCTS = [
    {
        name: "Blusa Lino Artesanal",
        price: 89.00,
        gender: "mujer",
        subcategory: "ropa",
        images: ["https://images.unsplash.com/photo-1534126416832-a88fdf2911c2"],
        rating: 4.8,
        isNew: true,
        sizes: [{name: 'S', stock: 5}, {name: 'M', stock: 8}, {name: 'L', stock: 3}],
        totalStock: 16
    },
    {
        name: "Cinturón Cuero Trenzado",
        price: 45.00,
        gender: "mujer",
        subcategory: "accesorios",
        images: ["https://images.unsplash.com/photo-1624223359997-742d7f6e1ded"],
        rating: 4.9,
        isNew: false,
        sizes: [{name: '85', stock: 10}, {name: '90', stock: 5}],
        totalStock: 15
    },
    {
        name: "Camisa Algodón Crudo",
        price: 65.00,
        gender: "hombre",
        subcategory: "ropa",
        images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c"],
        rating: 4.6,
        isNew: true,
        sizes: [{name: 'L', stock: 10}, {name: 'XL', stock: 5}],
        totalStock: 15
    }
];

// --- COMPONENTE DE ADMINISTRACIÓN (CMS) ---

const initialProductFormState = {
    name: '',
    price: 0,
    gender: 'mujer',
    subcategory: 'ropa',
    images: [], 
    rating: 5.0,
    isNew: true,
    sizes: [] 
};

const AdminPanel = ({ products, userId }) => {
    const [activeTab, setActiveTab] = useState('products');
    const [orders, setOrders] = useState([]);
    
    // Estado global de configuración
    const [config, setConfig] = useState({
        shipping: { cost: 15, threshold: 150 },
        brand: { name: 'TARUMBA', instagram: '', facebook: '', logo: '' }, 
        hero: { 
            title: 'Alma Artesanal\nEspíritu Libre.', 
            subtitle: 'Cinturones, accesorios y piezas únicas creadas con pasión.',
            image: 'https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?q=80&w=2070&auto=format&fit=crop'
        }
    });
    
    const [formData, setFormData] = useState(initialProductFormState);
    const [editingId, setEditingId] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const [newSizeName, setNewSizeName] = useState('');
    const [newSizeStock, setNewSizeStock] = useState(1);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [newImageUrl, setNewImageUrl] = useState('');

    const productsCollectionRef = db ? collection(db, `artifacts/${appId}/public/data/products`) : null;
    const ordersCollectionRef = db ? collection(db, `artifacts/${appId}/public/data/orders`) : null;
    const configDocRef = db ? doc(db, `artifacts/${appId}/public/data/settings`, 'store_config') : null;
    
    useEffect(() => {
        if (!db) return;

        if (activeTab === 'orders' && ordersCollectionRef) {
            const q = query(ordersCollectionRef, orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, () => {
                onSnapshot(ordersCollectionRef, (snapshot) => {
                     setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                     .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
                });
            });
            return () => unsubscribe();
        }

        if (activeTab === 'settings' && configDocRef) {
            const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setConfig(prev => ({ ...prev, ...docSnap.data() }));
                }
            });
            return () => unsubscribe();
        }
    }, [activeTab]);

    const showStatus = (type, text) => {
        setStatusMessage({ type, text });
        setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);
    };

    const handleProductChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'price' || name === 'rating' ? parseFloat(value) : value),
        }));
    };

    const handleAddImageUrl = () => {
        if (!newImageUrl) return;
        setFormData(prev => ({
            ...prev,
            images: [...(prev.images || []), newImageUrl]
        }));
        setNewImageUrl('');
    };

    const handleRemoveImage = (index) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    
    const handleSetMainImage = (index) => setFormData(prev => {
        const newImages = [...prev.images];
        const main = newImages.splice(index, 1)[0];
        newImages.unshift(main);
        return { ...prev, images: newImages };
    });

    const addSize = () => {
        if (!newSizeName) return;
        const updatedSizes = [...(formData.sizes || [])];
        const existingIndex = updatedSizes.findIndex(s => s.name.toUpperCase() === newSizeName.toUpperCase());
        if (existingIndex >= 0) updatedSizes[existingIndex].stock = parseInt(newSizeStock);
        else updatedSizes.push({ name: newSizeName.toUpperCase(), stock: parseInt(newSizeStock) });
        setFormData(prev => ({ ...prev, sizes: updatedSizes }));
        setNewSizeName(''); setNewSizeStock(1);
    };
    const removeSize = (index) => {
        const updatedSizes = [...(formData.sizes || [])];
        updatedSizes.splice(index, 1);
        setFormData(prev => ({ ...prev, sizes: updatedSizes }));
    };

    const handleSubmitProduct = async (e) => {
        e.preventDefault();
        if (!productsCollectionRef) return;
        const productData = {
            ...formData,
            price: parseFloat(formData.price),
            rating: parseFloat(formData.rating),
            totalStock: (formData.sizes || []).reduce((acc, curr) => acc + curr.stock, 0),
            image: formData.images.length > 0 ? formData.images[0] : '' 
        };
        try {
            if (editingId) {
                await updateDoc(doc(productsCollectionRef, editingId), productData);
                showStatus('success', `Producto "${formData.name}" actualizado.`);
            } else {
                await addDoc(productsCollectionRef, productData);
                showStatus('success', `Producto "${formData.name}" creado.`);
            }
            setFormData(initialProductFormState);
            setEditingId(null);
        } catch (error) {
            showStatus('error', 'Error al guardar.');
        }
    };

    const handleSeedData = async () => {
        if (!productsCollectionRef) return;
        try {
            for (const product of SAMPLE_PRODUCTS) {
                await addDoc(productsCollectionRef, product);
            }
            showStatus('success', '¡Productos cargados!');
        } catch (error) {
            showStatus('error', 'Error al cargar datos.');
        }
    };

    const handleEditProduct = (product) => {
        setEditingId(product.id);
        const images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
        setFormData({ ...product, price: parseFloat(product.price), rating: parseFloat(product.rating), sizes: product.sizes || [], images });
        window.scrollTo(0,0);
    };

    const executeDeleteProduct = async (id) => {
        try {
            await deleteDoc(doc(productsCollectionRef, id));
            showStatus('success', 'Producto eliminado.');
            setDeleteConfirmId(null);
        } catch (error) {
            showStatus('error', 'Error al eliminar.');
        }
    };

    const toggleOrderStatus = async (order) => {
        const newStatus = order.status === 'pending' ? 'shipped' : 'pending';
        try {
            await updateDoc(doc(ordersCollectionRef, order.id), { status: newStatus });
            showStatus('success', 'Estado actualizado.');
        } catch (error) { showStatus('error', 'Error al actualizar.'); }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este pedido del historial?")) return;
        try {
            await deleteDoc(doc(ordersCollectionRef, orderId));
            showStatus('success', 'Pedido eliminado del historial.');
        } catch (error) {
            console.error(error);
            showStatus('error', 'Error al eliminar pedido.');
        }
    };

    const handleConfigChange = (section, field, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        if (!configDocRef) return;
        try {
            await setDoc(configDocRef, config);
            showStatus('success', 'Configuración guardada correctamente.');
        } catch (error) {
            console.error(error);
            showStatus('error', 'Error al guardar configuración.');
        }
    };

    return (
        <section className="container mx-auto px-6 py-12 bg-[#efece6] rounded-lg shadow-xl my-12 animate-in fade-in text-[#4a3b32]">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <h2 className="text-3xl font-serif font-bold flex items-center gap-3 text-[#4a3b32]">
                    <Edit size={32} /> Panel de Administrador
                </h2>
                <div className="flex bg-[#f9f7f2] rounded-lg p-1 shadow-sm mt-4 md:mt-0 overflow-x-auto border border-[#e5e0d8]">
                    {['products', 'orders', 'settings'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#4a3b32] text-white' : 'text-stone-500 hover:text-[#4a3b32]'}`}>
                            {tab === 'products' ? 'Productos' : tab === 'orders' ? 'Pedidos' : 'Configuración'}
                        </button>
                    ))}
                </div>
            </div>

            {statusMessage.text && (
                <div className={`p-3 mb-4 rounded-lg text-sm font-medium flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    {statusMessage.text}
                </div>
            )}

            {/* --- PESTAÑA CONFIGURACIÓN --- */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-lg shadow-md border border-[#e5e0d8]">
                            <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-[#4a3b32]"><Globe size={18}/> Identidad de Marca</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Nombre de la Tienda</label>
                                    <input type="text" value={config.brand.name} onChange={(e) => handleConfigChange('brand', 'name', e.target.value)} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-2">URL del Logo</label>
                                    {config.brand.logo && (
                                        <div className="mb-2 h-16 w-auto bg-[#f9f7f2] rounded border border-[#e5e0d8] p-2 inline-block">
                                            <img src={config.brand.logo} className="h-full w-auto object-contain" alt="Logo Preview" />
                                        </div>
                                    )}
                                    <input 
                                        type="text" 
                                        value={config.brand.logo || ''} 
                                        onChange={(e) => handleConfigChange('brand', 'logo', e.target.value)} 
                                        className="w-full border border-[#e5e0d8] rounded p-2 text-sm" 
                                        placeholder="https://i.imgur.com/..." 
                                    />
                                    <p className="text-xs text-stone-500 mt-1">Pega aquí el enlace directo a tu imagen de logo.</p>
                                </div>
                                <div className="pt-4 border-t border-[#e5e0d8]">
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Instagram URL</label>
                                    <input type="text" value={config.brand.instagram} onChange={(e) => handleConfigChange('brand', 'instagram', e.target.value)} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" placeholder="https://instagram.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Facebook URL</label>
                                    <input type="text" value={config.brand.facebook} onChange={(e) => handleConfigChange('brand', 'facebook', e.target.value)} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" placeholder="https://facebook.com/..." />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md border border-[#e5e0d8]">
                            <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-[#4a3b32]"><Truck size={18}/> Envíos</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Costo Estándar ($)</label>
                                    <input type="number" value={config.shipping.cost} onChange={(e) => handleConfigChange('shipping', 'cost', parseFloat(e.target.value))} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Envío Gratis desde ($)</label>
                                    <input type="number" value={config.shipping.threshold} onChange={(e) => handleConfigChange('shipping', 'threshold', parseFloat(e.target.value))} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-[#e5e0d8]">
                        <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-[#4a3b32]"><Layout size={18}/> Personalizar Portada</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Título Principal</label>
                                <textarea value={config.hero.title} onChange={(e) => handleConfigChange('hero', 'title', e.target.value)} className="w-full border border-[#e5e0d8] rounded p-2 text-sm h-20" placeholder="Usa enter para saltos de línea" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Subtítulo</label>
                                <input type="text" value={config.hero.subtitle} onChange={(e) => handleConfigChange('hero', 'subtitle', e.target.value)} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-2">Imagen de Fondo (URL)</label>
                                <div className="mb-2 h-32 w-full bg-gray-100 rounded overflow-hidden border border-[#e5e0d8]">
                                    <img src={config.hero.image} className="w-full h-full object-cover" alt="Hero Preview" />
                                </div>
                                <input type="text" value={config.hero.image} onChange={(e) => handleConfigChange('hero', 'image', e.target.value)} className="w-full border border-[#e5e0d8] rounded p-2 text-sm" placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <button onClick={handleSaveConfig} className="w-full bg-[#4a3b32] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#2e2520] transition-colors shadow-lg">
                            Guardar Todos los Cambios
                        </button>
                    </div>
                </div>
            )}

            {/* --- PESTAÑA PRODUCTOS --- */}
            {activeTab === 'products' && (
                <>
                    <div className="mb-6 flex justify-end">
                        <button onClick={handleSeedData} className="flex items-center gap-2 text-xs bg-[#efece6] border border-[#4a3b32] text-[#4a3b32] px-4 py-2 rounded hover:bg-[#e5e0d8] transition-colors">
                            <Database size={14}/> Cargar Datos Demo
                        </button>
                    </div>

                    <div className="p-6 bg-white rounded-lg shadow-md mb-8 border-t-4 border-[#4a3b32]">
                        <h3 className="text-xl font-bold font-serif mb-4 flex items-center gap-2 text-[#4a3b32]">
                            {editingId ? 'Editar Producto' : 'Añadir Nuevo Producto'}
                        </h3>
                        <form onSubmit={handleSubmitProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-medium mb-1">Nombre</label><input type="text" name="name" value={formData.name} onChange={handleProductChange} required className="w-full border border-[#e5e0d8] rounded p-2" /></div>
                            <div><label className="block text-sm font-medium mb-1">Precio ($)</label><input type="number" name="price" value={formData.price} onChange={handleProductChange} required step="0.01" className="w-full border border-[#e5e0d8] rounded p-2" /></div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Género</label>
                                <select name="gender" value={formData.gender} onChange={handleProductChange} className="w-full border border-[#e5e0d8] rounded p-2 bg-white">
                                    <option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="unisex">Unisex</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Subcategoría</label>
                                <select name="subcategory" value={formData.subcategory} onChange={handleProductChange} className="w-full border border-[#e5e0d8] rounded p-2 bg-white">
                                    <option value="ropa">Ropa</option><option value="accesorios">Accesorios</option>
                                </select>
                            </div>
                            
                            {/* Gestión de Imágenes por URL */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Galería de Imágenes (URLs)</label>
                                <div className="bg-[#f9f7f2] p-4 rounded-lg border border-[#e5e0d8]">
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            type="text" 
                                            value={newImageUrl} 
                                            onChange={(e) => setNewImageUrl(e.target.value)} 
                                            className="flex-grow border border-[#e5e0d8] rounded p-2 text-sm" 
                                            placeholder="Pega aquí el enlace de la imagen (https://...)"
                                        />
                                        <button type="button" onClick={handleAddImageUrl} className="bg-[#4a3b32] text-white px-4 py-2 rounded text-sm hover:bg-[#2e2520] flex items-center gap-2">
                                            <LinkIcon size={14} /> Añadir
                                        </button>
                                    </div>
                                    
                                    {formData.images && formData.images.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-4">
                                            {formData.images.map((img, idx) => (
                                                <div key={idx} className="relative group aspect-square bg-white rounded border border-[#e5e0d8] overflow-hidden">
                                                    <img src={img} className="w-full h-full object-cover" alt="" onError={(e)=>{e.target.src="https://placehold.co/100?text=Error"}}/>
                                                    <div className="absolute inset-0 bg-[#4a3b32]/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                                                        {idx !== 0 && <button type="button" onClick={() => handleSetMainImage(idx)} className="text-[10px] bg-white px-2 py-1 rounded">Principal</button>}
                                                        <button type="button" onClick={() => handleRemoveImage(idx)} className="bg-red-500 text-white p-1 rounded-full"><Trash2 size={12}/></button>
                                                    </div>
                                                    {idx === 0 && <span className="absolute top-0 left-0 bg-[#b05d4b] text-white text-[10px] px-1">Portada</span>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-stone-400 text-center mt-2">Sin imágenes.</p>}
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded border border-slate-200">
                                <label className="block text-sm font-bold mb-2">Stock y Tallas</label>
                                <div className="flex gap-2 mb-2 items-end">
                                    <input type="text" value={newSizeName} onChange={(e)=>setNewSizeName(e.target.value)} className="w-20 border rounded p-1 text-sm uppercase" placeholder="Talla" />
                                    <input type="number" value={newSizeStock} onChange={(e)=>setNewSizeStock(e.target.value)} className="w-20 border rounded p-1 text-sm" placeholder="Stock" />
                                    <button type="button" onClick={addSize} className="bg-[#4a3b32] text-white px-3 py-1 rounded text-sm">Añadir</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.sizes?.map((s, i) => (
                                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white border rounded text-xs"><span className="font-bold">{s.name}</span><span>({s.stock})</span><button type="button" onClick={()=>removeSize(i)}><X size={12}/></button></div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4">
                                {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData(initialProductFormState);}} className="px-4 py-2 text-sm border rounded">Cancelar</button>}
                                <button type="submit" className="bg-[#4a3b32] text-white px-6 py-2 rounded text-sm font-bold">{editingId ? 'Actualizar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                    <div className="space-y-4">
                        {products.map(p => (
                            <div key={p.id} className="bg-white p-4 rounded shadow-sm border flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img src={p.images?.[0] || p.image} className="h-12 w-12 object-cover rounded" alt=""/>
                                    <div><p className="font-bold text-sm">{p.name}</p><p className="text-xs text-gray-500">Stock: {p.totalStock}</p></div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => handleEditProduct(p)} className="p-2 hover:bg-gray-100 rounded-full"><Edit size={16}/></button>
                                    {deleteConfirmId === p.id ? (
                                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-full animate-in slide-in-from-right">
                                            <button onClick={() => executeDeleteProduct(p.id)} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-700">¿Confirmar?</button>
                                            <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-stone-500 hover:text-stone-700"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirmId(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* --- PESTAÑA PEDIDOS --- */}
            {activeTab === 'orders' && (
                <div className="space-y-4">
                    {orders.length === 0 ? <p className="text-center text-gray-500 py-10">No hay pedidos.</p> : orders.map(order => (
                        <div key={order.id} className="bg-white border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <div><span className="font-bold text-sm">#{order.id.substring(0,8)}</span> <span className={`text-xs px-2 py-0.5 rounded border ${order.status === 'shipped' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>{order.status === 'shipped' ? 'Enviado' : 'Pendiente'}</span></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleOrderStatus(order)} className="text-xs font-bold underline">{order.status === 'shipped' ? 'Marcar Pendiente' : 'Marcar Enviado'}</button>
                                    {/* BOTÓN DE ELIMINAR PEDIDO - Solo si está enviado */}
                                    {order.status === 'shipped' && (
                                        <button 
                                            onClick={() => handleDeleteOrder(order.id)} 
                                            className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Eliminar Pedido del Historial"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 text-sm">
                                <p className="font-bold">{order.customer?.name}</p>
                                <div className="flex flex-col sm:flex-row sm:gap-4 text-gray-600 text-xs mb-2">
                                    <p>{order.customer?.email}</p>
                                    {order.customer?.phone && <p className="flex items-center gap-1"><Phone size={10}/> {order.customer.phone}</p>}
                                </div>
                                {order.paymentMethod === 'apple_pay' && (
                                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[10px] rounded">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.55-.67.92-1.56.92-2.5 0-.05 0-.1-.02-.15-1.3.13-2.87.9-3.8 2.02-.47.55-.88 1.44-.88 2.33 0 .05.02.1.02.15 1.44.11 2.92-.73 3.76-1.85z"/></svg>
                                        Pagado con Apple Pay
                                    </div>
                                )}
                                <div className="mt-2 pt-2 border-t">
                                    {order.items?.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs py-1"><span>{item.name} ({item.selectedSize}) x{item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)}</span></div>
                                    ))}
                                    <div className="flex justify-between font-bold mt-2 text-base"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

// --- COMPONENTES VISUALES ---

const ProductModal = ({ product, isOpen, onClose, onAddToCart }) => {
    const [selectedSize, setSelectedSize] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showSizeError, setShowSizeError] = useState(false);

    useEffect(() => { 
        setCurrentImageIndex(0); 
        setSelectedSize(null); 
        setShowSizeError(false);
    }, [product]);

    if (!isOpen || !product) return null;

    const images = product.images && product.images.length > 0 ? product.images : [product.image];
    const totalStock = product.sizes ? product.sizes.reduce((a, c) => a + c.stock, 0) : 100;
    const isSoldOut = totalStock === 0;

    const handleAddToCart = () => {
        // Verificación: Si el producto tiene tallas y no se ha elegido ninguna
        if (product.sizes?.length > 0 && !selectedSize) {
            setShowSizeError(true); // Mostrar error visual
            return; // Detener ejecución (NO usar alert)
        }
        onAddToCart(product, selectedSize);
        onClose();
        setSelectedSize(null);
    };

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#4a3b32]/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#f9f7f2] rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] md:max-h-[600px] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-3 right-3 z-50 bg-white/90 p-2 rounded-full hover:bg-white text-[#4a3b32] shadow-md transition-transform hover:scale-110">
                    <X size={24} />
                </button>
                <div className="w-full md:w-3/5 h-48 md:h-full bg-[#efece6] relative flex items-center justify-center group flex-shrink-0">
                    <img src={images[currentImageIndex]} className="w-full h-full object-cover" alt=""/>
                    {isSoldOut && <div className="absolute inset-0 bg-[#4a3b32]/60 flex items-center justify-center"><span className="text-white font-bold border-2 border-white px-4 py-2">AGOTADO</span></div>}
                    {images.length > 1 && (
                        <>
                            <button onClick={prevImage} className="absolute left-4 bg-white/60 p-2 rounded-full hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity text-[#4a3b32]"><ChevronLeft size={20}/></button>
                            <button onClick={nextImage} className="absolute right-4 bg-white/60 p-2 rounded-full hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity text-[#4a3b32]"><ChevronRight size={20}/></button>
                        </>
                    )}
                </div>
                <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col overflow-y-auto">
                    <div className="flex-grow">
                        <h2 className="text-2xl font-serif font-bold text-[#4a3b32] mb-2">{product.name}</h2>
                        <p className="text-xl font-medium text-[#4a3b32] mb-6">${parseFloat(product.price).toFixed(2)}</p>
                        {images.length > 1 && (
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                {images.map((img, idx) => (
                                    <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-12 h-12 flex-shrink-0 border rounded overflow-hidden ${idx === currentImageIndex ? 'border-[#4a3b32]' : 'border-transparent'}`}><img src={img} className="w-full h-full object-cover" alt=""/></button>
                                ))}
                            </div>
                        )}
                        <div className="mb-8">
                            {product.sizes?.length > 0 ? (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {product.sizes.map((s, i) => (
                                            <button key={i} disabled={s.stock===0} onClick={() => {setSelectedSize(s.name); setShowSizeError(false);}} className={`min-w-[3rem] h-10 border rounded-md text-sm font-medium ${s.stock===0 ? 'opacity-40 line-through' : selectedSize===s.name ? 'bg-[#4a3b32] text-white' : 'hover:border-[#4a3b32]'}`}>{s.name}</button>
                                        ))}
                                    </div>
                                    {showSizeError && <p className="text-red-600 text-xs mt-2 font-bold flex items-center gap-1"><AlertTriangle size={12}/> Por favor, selecciona una talla</p>}
                                </>
                            ) : <div className="text-sm italic text-stone-500">Talla Única</div>}
                        </div>
                    </div>
                    <button onClick={handleAddToCart} disabled={isSoldOut || (product.sizes?.length > 0 && !selectedSize && !showSizeError)} className="w-full py-4 bg-[#4a3b32] text-white font-bold uppercase tracking-widest hover:bg-[#2e2520] disabled:opacity-50">
                        {isSoldOut ? 'Agotado' : 'Añadir a la Bolsa'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Navbar = ({ cartCount, onOpenCart, onSearchChange, isAdminVisible, onExitAdmin, config }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#f9f7f2]/90 backdrop-blur-md shadow-sm py-4 border-b border-[#e5e0d8]' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-[#4a3b32]"><Menu size={24} /></button>
        
        <div className="cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            {config.brand?.logo ? (
                <img src={config.brand.logo} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
                <span className="font-glamour text-4xl font-normal tracking-wide text-[#4a3b32]">
                    {config.brand?.name || 'TARUMBA'}
                </span>
            )}
        </div>

        <div className="hidden md:flex space-x-8 items-center text-sm font-medium text-stone-600">
          <a href="#" className="hover:text-[#4a3b32] transition-colors">Novedades</a>
          <a href="#shop" className="hover:text-[#4a3b32] transition-colors">Colección</a>
        </div>
        <div className="flex items-center space-x-5 text-[#4a3b32]">
          {/* BARRA DE BÚSQUEDA / LOGIN SECRETO */}
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-2 text-stone-400" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                onChange={onSearchChange}
                className="pl-8 pr-3 py-1 rounded-full border border-[#e5e0d8] text-sm bg-white/50 focus:bg-white focus:border-[#4a3b32] focus:outline-none transition-all w-32 focus:w-48" 
            />
          </div>
          
          {/* BOTÓN SALIR ADMIN (Solo visible si es admin) */}
          {isAdminVisible && (
              <button onClick={onExitAdmin} className="text-xs px-3 py-1 rounded-full border border-[#4a3b32] bg-[#4a3b32] text-white hover:bg-[#2e2520] flex items-center gap-1 transition-colors">
                  <LogOut size={12} /> Salir Admin
              </button>
          )}
          
          <div className="relative cursor-pointer" onClick={onOpenCart}>
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-[#b05d4b] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>}
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#f9f7f2] border-b border-[#e5e0d8] p-4 md:hidden animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-4 text-center">
            <a href="#" className="text-[#4a3b32] font-medium">Novedades</a>
            <a href="#shop" className="text-[#4a3b32] font-medium">Colección</a>
          </div>
        </div>
      )}
    </nav>
  );
};

const Hero = ({ config }) => {
  return (
    <section className="relative h-[90vh] w-full bg-[#efece6] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <img src={config.hero?.image} alt="Hero" className="w-full h-full object-cover opacity-90 sepia-[.2]" />
        <div className="absolute inset-0 bg-[#4a3b32]/30 mix-blend-multiply" />
      </div>
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <span className="uppercase tracking-[0.2em] text-sm md:text-base mb-4 block animate-fade-in-up text-[#efece6]">Diseño Argentino</span>
        <h1 className="text-5xl md:text-7xl font-glamour font-bold mb-6 leading-tight animate-fade-in-up delay-100 text-[#f9f7f2] whitespace-pre-wrap">
          {config.hero?.title || 'Alma Artesanal'}
        </h1>
        <p className="text-lg md:text-xl text-[#f9f7f2]/90 mb-10 max-w-2xl mx-auto font-light animate-fade-in-up delay-200">
          {config.hero?.subtitle}
        </p>
        <button className="bg-[#f9f7f2] text-[#4a3b32] px-8 py-4 text-sm font-bold uppercase tracking-wider hover:bg-[#4a3b32] hover:text-white transition-all duration-300 animate-fade-in-up delay-300 shadow-lg">
          Descubrir Colección
        </button>
      </div>
    </section>
  );
};

const ProductCard = ({ product, onOpenModal }) => {
    const price = parseFloat(product.price);
    const rating = parseFloat(product.rating);
    const mainImage = product.images && product.images.length > 0 ? product.images[0] : product.image;
    const isSoldOut = (product.sizes ? product.sizes.reduce((a, c) => a + c.stock, 0) : 100) === 0;

    return (
    <div className="group relative">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#efece6] mb-4 cursor-pointer rounded-sm" onClick={() => onOpenModal(product)}>
        <img src={mainImage} alt={product.name} onError={(e)=>{e.target.src="https://placehold.co/600x800?text=..."}} className={`h-full w-full object-cover transition-transform duration-700 ease-out ${isSoldOut ? 'grayscale opacity-75' : 'group-hover:scale-105'}`} />
        {product.images?.length > 1 && !isSoldOut && <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-sm p-1 rounded-full text-xs px-2 flex items-center gap-1 text-[#4a3b32]"><ImageIcon size={12}/> {product.images.length}</div>}
        {product.isNew && !isSoldOut && <span className="absolute top-3 left-3 bg-[#f9f7f2] px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#4a3b32] shadow-sm">Nuevo</span>}
        {isSoldOut && <div className="absolute inset-0 flex items-center justify-center bg-[#4a3b32]/40"><span className="bg-[#f9f7f2] text-[#4a3b32] px-4 py-2 text-sm font-bold uppercase border border-[#4a3b32] shadow-lg">Agotado</span></div>}
        {!isSoldOut && <button onClick={(e) => { e.stopPropagation(); onOpenModal(product); }} className="absolute bottom-4 right-4 bg-[#4a3b32] text-white p-3 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg hover:bg-[#2e2520]"><Plus size={20} /></button>}
      </div>
      <div>
        <div className="flex justify-between items-start">
            <h3 className="text-base font-medium text-[#4a3b32] cursor-pointer font-serif" onClick={() => onOpenModal(product)}>{product.name}</h3>
            <div className="flex items-center space-x-1 text-[#b05d4b] text-xs"><Star size={12} fill="currentColor" /> <span className="text-stone-500">{product.rating}</span></div>
        </div>
        <p className="mt-1 text-sm text-stone-500 capitalize">{product.gender} / {product.subcategory}</p>
        <p className="mt-2 text-sm font-semibold text-[#4a3b32]">${!isNaN(price) ? price.toFixed(2) : '0.00'}</p>
      </div>
    </div>
  );
};

const CartDrawer = ({ isOpen, onClose, cartItems, onRemove, onUpdateQty, onCheckoutSuccess, shippingConfig }) => {
  // Step 1: Shipping Info, Step 2: Payment
  const [checkoutStep, setCheckoutStep] = useState(1); 
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', city: '', postalCode: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'apple_pay'

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shippingCost = subtotal >= (shippingConfig?.threshold || 150) ? 0 : (shippingConfig?.cost || 15);
  const total = subtotal + shippingCost;

  // Reset step when drawer closes
  useEffect(() => {
      if (!isOpen) {
          setCheckoutStep(1);
          setError(null);
      }
  }, [isOpen]);

  const handleCustomerChange = (e) => {
      setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const goToPayment = (e) => {
      e.preventDefault();
      setCheckoutStep(2);
  };

  const handleCheckout = async () => {
      if (!db) {
          setError("Error: No hay conexión con la base de datos.");
          return;
      }
      
      setIsSubmitting(true);
      try {
          const order = {
              customer,
              items: cartItems,
              subtotal,
              shipping: shippingCost,
              total,
              status: 'pending',
              paymentMethod: paymentMethod, // 'card' or 'apple_pay'
              createdAt: Timestamp.now()
          };
          
          await addDoc(collection(db, `artifacts/${appId}/public/data/orders`), order);
          
          setIsSubmitting(false);
          onCheckoutSuccess();
          setCustomer({ name: '', email: '', phone: '', address: '', city: '', postalCode: '' });
          setCheckoutStep(1);
      } catch (error) {
          console.error(error);
          setIsSubmitting(false);
          if (error.code === 'permission-denied') {
              setError("Error de permisos: Configura las reglas de Firestore.");
          } else {
              setError("Hubo un error al procesar el pedido. Inténtalo de nuevo.");
          }
      }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-[#4a3b32]/50 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#f9f7f2] shadow-2xl z-[70] transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-[#e5e0d8] flex justify-between items-center bg-[#f9f7f2]">
             <div className="font-glamour text-2xl font-bold text-[#4a3b32]">
                TARUMBA
             </div>
            <button onClick={onClose} className="text-stone-400 hover:text-[#4a3b32] transition-colors"><X size={24} /></button>
          </div>

          {/* --- CONTENIDO DEL DRAWER --- */}
          {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-6">
                <ShoppingBag size={48} className="text-[#e5e0d8]" />
                <p className="text-stone-500">Tu bolsa está vacía.</p>
                <button onClick={onClose} className="text-[#4a3b32] font-medium underline underline-offset-4 hover:text-[#2e2520]">
                    Continuar comprando
                </button>
            </div>
          ) : (
             <>
                {checkoutStep === 1 && (
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-lg font-bold text-[#4a3b32] mb-4 flex items-center gap-2"><Truck size={18}/> 1. Datos de Envío</h3>
                        <form id="shipping-form" onSubmit={goToPayment} className="space-y-4">
                            <input type="text" placeholder="Nombre Completo" name="name" required value={customer.name} onChange={handleCustomerChange} className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white focus:border-[#4a3b32] focus:ring-1 focus:ring-[#4a3b32] outline-none" />
                            <input type="email" placeholder="Email" name="email" required value={customer.email} onChange={handleCustomerChange} className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white focus:border-[#4a3b32] focus:ring-1 focus:ring-[#4a3b32] outline-none" />
                            <input type="tel" placeholder="Teléfono Móvil" name="phone" required value={customer.phone} onChange={handleCustomerChange} className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white focus:border-[#4a3b32] focus:ring-1 focus:ring-[#4a3b32] outline-none" />
                            <input type="text" placeholder="Dirección de Entrega" name="address" required value={customer.address} onChange={handleCustomerChange} className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white focus:border-[#4a3b32] focus:ring-1 focus:ring-[#4a3b32] outline-none" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Ciudad" name="city" required value={customer.city} onChange={handleCustomerChange} className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white focus:border-[#4a3b32] focus:ring-1 focus:ring-[#4a3b32] outline-none" />
                                <input type="text" placeholder="Código Postal" name="postalCode" required value={customer.postalCode} onChange={handleCustomerChange} className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white focus:border-[#4a3b32] focus:ring-1 focus:ring-[#4a3b32] outline-none" />
                            </div>
                        </form>
                    </div>
                )}

                {checkoutStep === 2 && (
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <button onClick={() => setCheckoutStep(1)} className="p-1 hover:bg-[#e5e0d8] rounded-full transition-colors"><ChevronLeft size={20} className="text-[#4a3b32]"/></button>
                            <h3 className="text-lg font-bold text-[#4a3b32] flex items-center gap-2"><CreditCard size={18}/> 2. Método de Pago</h3>
                        </div>

                        {/* Resumen Rápido */}
                        <div className="bg-[#efece6] p-4 rounded-lg mb-6 text-sm text-stone-600 border border-[#e5e0d8]">
                            <div className="flex justify-between mb-1"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between mb-1"><span>Envío</span><span>{shippingCost === 0 ? <span className="text-green-700 font-bold">GRATIS</span> : `$${shippingCost.toFixed(2)}`}</span></div>
                            <div className="border-t border-[#dcd6cc] pt-2 mt-2 flex justify-between font-bold text-[#4a3b32] text-base"><span>Total a Pagar</span><span>${total.toFixed(2)}</span></div>
                        </div>

                        {/* Selector de Método */}
                        <div className="flex gap-3 mb-6">
                            <button 
                                onClick={() => setPaymentMethod('card')}
                                className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-[#4a3b32] bg-[#4a3b32] text-white' : 'border-[#e5e0d8] bg-white text-stone-500 hover:border-[#4a3b32]'}`}
                            >
                                <CreditCard size={20} /> Tarjeta
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('apple_pay')}
                                className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 transition-all ${paymentMethod === 'apple_pay' ? 'border-black bg-black text-white' : 'border-[#e5e0d8] bg-white text-stone-500 hover:border-black'}`}
                            >
                                <div className="flex items-center gap-1"><span className="font-bold"></span> Pay</div> Apple Pay
                            </button>
                        </div>

                        {/* Formulario Tarjeta (Simulado) */}
                        {paymentMethod === 'card' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-3 text-stone-400" size={18} />
                                    <input type="text" placeholder="Número de Tarjeta" className="w-full pl-10 border border-[#e5e0d8] rounded p-3 text-sm bg-white outline-none focus:border-[#4a3b32]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="MM / AA" className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white outline-none focus:border-[#4a3b32]" />
                                    <input type="text" placeholder="CVC" className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white outline-none focus:border-[#4a3b32]" />
                                </div>
                                <input type="text" placeholder="Nombre en la Tarjeta" className="w-full border border-[#e5e0d8] rounded p-3 text-sm bg-white outline-none focus:border-[#4a3b32]" />
                                
                                <div className="flex items-center gap-2 text-xs text-stone-500 mt-2 bg-green-50 p-2 rounded border border-green-100">
                                    <ShieldCheck size={14} className="text-green-600"/> Pago seguro encriptado SSL de 256 bits.
                                </div>
                            </div>
                        )}

                        {/* Apple Pay Info */}
                        {paymentMethod === 'apple_pay' && (
                            <div className="text-center p-6 bg-stone-50 rounded-lg border border-[#e5e0d8] animate-in fade-in">
                                <p className="text-sm text-stone-600 mb-4">Usa Touch ID o Face ID para completar tu compra de forma segura con Apple Pay.</p>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2 animate-in shake">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5"/>
                                <div>{error}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer del Drawer con Botones de Acción */}
                <div className="border-t border-[#e5e0d8] p-6 bg-[#efece6]">
                    {checkoutStep === 1 && (
                        <div className="space-y-4">
                            <div className="flex justify-between text-base font-bold text-[#4a3b32]">
                                <span>Total Estimado</span><span>${total.toFixed(2)}</span>
                            </div>
                            <button type="submit" form="shipping-form" className="w-full bg-[#4a3b32] text-white py-4 rounded-sm font-bold uppercase tracking-widest text-sm hover:bg-[#2e2520] transition-colors flex justify-center items-center gap-2">
                                Continuar al Pago <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {checkoutStep === 2 && (
                        <button 
                            onClick={handleCheckout} 
                            disabled={isSubmitting}
                            className={`w-full text-white py-4 rounded-sm font-bold uppercase tracking-widest text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-70 ${paymentMethod === 'apple_pay' ? 'bg-black hover:bg-gray-900' : 'bg-[#4a3b32] hover:bg-[#2e2520]'}`}
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (paymentMethod === 'apple_pay' ? `Pagar con Pay` : `Pagar $${total.toFixed(2)}`)}
                        </button>
                    )}
                </div>
             </>
          )}
        </div>
      </div>
    </>
  );
};

const FilterDropdown = ({ label, active, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all border ${active ? 'bg-[#4a3b32] text-white border-[#4a3b32]' : 'bg-[#f9f7f2] text-[#4a3b32] border-[#e5e0d8] hover:border-[#4a3b32]'}`}>{label}<ChevronDown size={16} /></button>
      {isOpen && <div className="absolute top-full left-0 mt-2 w-48 bg-[#f9f7f2] border border-[#e5e0d8] rounded-lg shadow-xl overflow-hidden z-20"><div className="py-1">
        {['Ver Todo', 'Ropa', 'Accesorios'].map(opt => <button key={opt} onClick={() => onSelect(opt === 'Ver Todo' ? 'all' : opt.toLowerCase())} className="block w-full text-left px-4 py-3 text-sm text-stone-600 hover:bg-[#efece6] hover:text-[#4a3b32]">{opt}</button>)}
      </div></div>}
    </div>
  );
};

const Footer = ({ config }) => (
    <footer className="bg-[#4a3b32] text-[#f9f7f2] pt-20 pb-10">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="flex flex-col items-start">
                    
                    {/* ZONA LOGO PIE DE PÁGINA */}
                    <div className="mb-6">
                        {config.brand?.logo ? (
                            <img src={config.brand.logo} alt={config.brand?.name} className="h-12 w-auto object-contain brightness-0 invert opacity-90" />
                        ) : (
                             <span className="font-glamour text-4xl font-normal tracking-wide text-[#f9f7f2]">
                                {config.brand?.name || 'TARUMBA'}
                            </span>
                        )}
                    </div>

                    <p className="text-[#dcd6cc] text-sm leading-relaxed mb-6">Diseño argentino con alma artesanal.</p>
                    <div className="flex space-x-4">
                        {config.brand?.instagram && <a href={config.brand.instagram} target="_blank"><Instagram size={20} className="text-[#dcd6cc] hover:text-white" /></a>}
                        {config.brand?.facebook && <a href={config.brand.facebook} target="_blank"><Facebook size={20} className="text-[#dcd6cc] hover:text-white" /></a>}
                    </div>
                </div>
                <div><h4 className="text-sm font-bold uppercase mb-6 text-[#efece6]">Comprar</h4><ul className="space-y-3 text-sm text-[#dcd6cc]"><li>Mujer</li><li>Hombre</li><li>Accesorios</li></ul></div>
                <div><h4 className="text-sm font-bold uppercase mb-6 text-[#efece6]">Ayuda</h4><ul className="space-y-3 text-sm text-[#dcd6cc]"><li>Envíos</li><li>Contacto</li></ul></div>
            </div>
            <div className="border-t border-[#5c4b41] pt-8 flex justify-between text-xs text-[#dcd6cc]"><p>&copy; 2024 {config.brand?.name}.</p></div>
        </div>
    </footer>
);

export default function App() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState({ gender: 'all', type: 'all' });
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [config, setConfig] = useState({
      shipping: { cost: 15, threshold: 150 },
      brand: { name: 'TARUMBA', instagram: '', facebook: '' },
      hero: { title: 'Alma Artesanal\nEspíritu Libre.', subtitle: 'Cinturones y accesorios únicos.', image: 'https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?q=80&w=2070&auto=format&fit=crop' }
  });

  useEffect(() => {
    if (!auth) { setIsAuthReady(true); return; }
    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
            else await signInAnonymously(auth);
        } catch (e) { console.error(e); }
    };
    onAuthStateChanged(auth, (u) => { setUserId(u?.uid || null); setIsAuthReady(true); });
    initAuth();
  }, []);

  useEffect(() => {
    if (!db || !isAuthReady || !userId) return;
    const unsubProd = onSnapshot(collection(db, `artifacts/${appId}/public/data/products`), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubConfig = onSnapshot(doc(db, `artifacts/${appId}/public/data/settings`, 'store_config'), (s) => { if (s.exists()) setConfig(prev => ({...prev, ...s.data()})) });
    return () => { unsubProd(); unsubConfig(); };
  }, [isAuthReady, userId]);

  const filteredProducts = useMemo(() => products.filter(p => {
      const matchesFilter = (filter.gender==='all'||p.gender===filter.gender||p.gender==='unisex') && (filter.type==='all'||p.subcategory===filter.type);
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
  }), [filter, products, searchQuery]);
  
  const handleSearchChange = (e) => {
      const val = e.target.value;
      if (val === 'tarumba2024') {
          setIsAdminVisible(true);
          setSearchQuery(''); 
          setNotification("¡Modo Admin Activado!");
          setTimeout(() => setNotification(null), 3000);
      } else {
          setSearchQuery(val);
      }
  };

  const handleExitAdmin = () => {
      setIsAdminVisible(false);
      setNotification("Modo Admin Desactivado");
      setTimeout(() => setNotification(null), 2000);
  };

  const addToCart = (p, s) => {
      setCart(prev => {
          const ex = prev.find(i => i.id === p.id && i.selectedSize === s);
          if (ex) return prev.map(i => (i.id === p.id && i.selectedSize === s) ? { ...i, quantity: i.quantity + 1 } : i);
          return [...prev, { ...p, quantity: 1, selectedSize: s }];
      });
      setNotification(`${p.name} agregado`); setIsCartOpen(true); setTimeout(()=>setNotification(null), 3000);
  };

  const updateQty = (id, s, d) => setCart(prev => prev.map(i => (i.id===id && i.selectedSize===s) ? { ...i, quantity: Math.max(1, i.quantity + d) } : i));
  const removeFromCart = (id, s) => setCart(prev => prev.filter(i => !(i.id===id && i.selectedSize===s)));

  const handleCheckoutSuccess = () => {
      setCart([]); 
      setIsCartOpen(false);
      setNotification("¡Pedido realizado con éxito!");
      setTimeout(() => setNotification(null), 5000);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f9f7f2] text-[#4a3b32] font-sans selection:bg-[#4a3b32] selection:text-white pt-6">
      {/* INYECCIÓN DE FUENTE ITALIANA (Alternativa elegante a Glamour Absolute) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Italiana&display=swap');
        .font-glamour { font-family: 'Italiana', serif; }
      `}</style>

      {notification && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#4a3b32] text-white px-6 py-3 rounded-full z-[100] shadow-lg flex gap-2"><ShoppingBag size={16}/>{notification}</div>}
      
      <Navbar 
        cartCount={cartCount} 
        onOpenCart={()=>setIsCartOpen(true)} 
        onSearchChange={handleSearchChange}
        isAdminVisible={isAdminVisible}
        onExitAdmin={handleExitAdmin}
        config={config} 
      />
      
      <CartDrawer isOpen={isCartOpen} onClose={()=>setIsCartOpen(false)} cartItems={cart} onRemove={removeFromCart} onUpdateQty={updateQty} onCheckoutSuccess={handleCheckoutSuccess} shippingConfig={config.shipping} />
      
      <ProductModal product={selectedProduct} isOpen={!!selectedProduct} onClose={()=>setSelectedProduct(null)} onAddToCart={addToCart} />
      
      <main>
        <Hero config={config} />
        
        {isAdminVisible && <AdminPanel products={products} userId={userId} />}
        
        <section id="shop" className="container mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                <div><h2 className="text-3xl font-serif font-bold mb-4 text-[#4a3b32]">La Colección</h2><p className="text-stone-600">Piezas únicas con espíritu libre.</p></div>
                <div className="flex space-x-4 mt-4 md:mt-0">
                    <button onClick={()=>setFilter({gender:'all', type:'all'})} className={`px-6 py-3 rounded-full text-sm border ${filter.gender==='all'?'bg-[#4a3b32] text-white':'bg-[#f9f7f2] text-[#4a3b32]'}`}>Ver Todo</button>
                    <FilterDropdown label="Mujer" active={filter.gender==='mujer'} onSelect={(s)=>setFilter({gender:'mujer', type:s})} />
                    <FilterDropdown label="Hombre" active={filter.gender==='hombre'} onSelect={(s)=>setFilter({gender:'hombre', type:s})} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} onOpenModal={setSelectedProduct} />)}
            </div>
        </section>
      </main>
      <Footer config={config} />
    </div>
  );
}

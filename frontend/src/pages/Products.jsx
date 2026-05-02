import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Box, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";


const API_URL = "http://localhost:4002/api";

const emptyProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
};

// Validaciones según el modelo del backend
const validateProductForm = (form, isEdit = false) => {
  const errors = {};
  
  // Validar nombre (obligatorio, 2-100 caracteres)
  if (!form.name?.trim()) {
    errors.name = "El nombre es requerido";
  } else if (form.name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres";
  } else if (form.name.length > 100) {
    errors.name = "El nombre no puede tener más de 100 caracteres";
  }
  
  // Validar precio (obligatorio, número >= 0)
  if (!isEdit && (form.price === "" || form.price === undefined)) {
    errors.price = "El precio es requerido";
  } else if (form.price !== "" && isNaN(Number(form.price))) {
    errors.price = "El precio debe ser un número";
  } else if (Number(form.price) < 0) {
    errors.price = "El precio no puede ser negativo";
  }
  
  // Validar stock (obligatorio, entero >= 0)
  if (!isEdit && (form.stock === "" || form.stock === undefined)) {
    errors.stock = "El stock es requerido";
  } else if (form.stock !== "" && !Number.isInteger(Number(form.stock))) {
    errors.stock = "El stock debe ser un número entero";
  } else if (Number(form.stock) < 0) {
    errors.stock = "El stock no puede ser negativo";
  }
  
  // Validar descripción (opcional, máximo 500 caracteres)
  if (form.description && form.description.length > 500) {
    errors.description = "La descripción no puede tener más de 500 caracteres";
  }
  
  return errors;
};

const formatPrice = (value) => {
  let num = 0;
  if (value) {
    if (typeof value === 'object' && value?.$numberDecimal) {
      num = parseFloat(value.$numberDecimal);
    } else {
      num = Number(value);
    }
  }
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
};

const sortOptions = [
  { value: "name-asc", label: "Nombre A-Z" },
  { value: "name-desc", label: "Nombre Z-A" },
  { value: "price-desc", label: "Precio mayor" },
  { value: "price-asc", label: "Precio menor" },
  { value: "stock-desc", label: "Stock mayor" },
  { value: "stock-asc", label: "Stock menor" },
];

function Products() {
  const { user: authUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createForm, setCreateForm] = useState(emptyProductForm);
  const [editForm, setEditForm] = useState({ ...emptyProductForm, id: "" });
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const rowsPerPage = 10;

  // ========== FUNCIONES CRUD CON LA API ==========

  // Obtener productos (GET)
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesión expirada");
        }
        throw new Error("Error al cargar productos");
      }
      
      const data = await response.json();
      if (data.ok) {
        setProducts(data.data);
      } else {
        setError(data.message || "Error al cargar productos");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear producto (POST)
  const createProduct = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          price: Number(formData.price),
          stock: Number(formData.stock),
        }),
      });
      
      const data = await response.json();
      if (data.ok) {
        toast.success("Producto creado correctamente");
        fetchProducts(); // Recargar lista
        return true;
      } else {
        toast.error(data.message || "Error al crear producto");
        return false;
      }
    } catch (error) {
      toast.error("Error de conexión al crear producto");
      return false;
    }
  };

  // Actualizar producto (PUT)
  const updateProduct = async (id, formData) => {
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          price: Number(formData.price),
          stock: Number(formData.stock),
        }),
      });
      
      const data = await response.json();
      if (data.ok) {
        toast.success("Producto actualizado correctamente");
        fetchProducts(); // Recargar lista
        return true;
      } else {
        toast.error(data.message || "Error al actualizar producto");
        return false;
      }
    } catch (error) {
      toast.error("Error de conexión al actualizar producto");
      return false;
    }
  };

  // Eliminar producto (DELETE)
  const deleteProduct = async (id) => {
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      if (data.ok) {
        toast.success("Producto eliminado correctamente");
        fetchProducts(); // Recargar lista
        return true;
      } else {
        toast.error(data.message || "Error al eliminar producto");
        return false;
      }
    } catch (error) {
      toast.error("Error de conexión al eliminar producto");
      return false;
    }
  };

  // ========== MANEJADORES DEL CRUD ==========

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    const errors = validateProductForm(createForm);
    setCreateErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const created = await createProduct(createForm);
    if (created) {
      setCreateForm(emptyProductForm);
      setCreateErrors({});
      setIsCreateOpen(false);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    const errors = validateProductForm(editForm, true);
    setEditErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const updated = await updateProduct(editForm.id, editForm);
    if (updated) {
      setEditErrors({});
      setIsEditOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    await deleteProduct(deleteTarget.id);
    setExpandedRowId((prev) => (prev === deleteTarget.id ? null : prev));
    setDeleteTarget(null);
  };

  const openEditModal = (product) => {
    let priceValue = "";
    if (product.price) {
      if (typeof product.price === 'object' && product.price.$numberDecimal) {
        priceValue = product.price.$numberDecimal;
      } else {
        priceValue = product.price.toString();
      }
    }
    
    setEditForm({
      id: product._id || product.id,
      name: product.name,
      description: product.description || "",
      price: priceValue,
      stock: product.stock?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const requestDelete = (product) => {
    setDeleteTarget(product);
  };

  // ========== FILTRADO Y ORDENAMIENTO ==========

  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    const matches = products.filter((item) => {
      const bySearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term));

      return bySearch;
    });

    return [...matches].sort((first, second) => {
      switch (sortBy) {
        case "name-desc":
          return second.name.localeCompare(first.name, "es", { sensitivity: "base" });
        case "price-desc":
          return (Number(second.price) || 0) - (Number(first.price) || 0);
        case "price-asc":
          return (Number(first.price) || 0) - (Number(second.price) || 0);
        case "stock-desc":
          return (second.stock || 0) - (first.stock || 0);
        case "stock-asc":
          return (first.stock || 0) - (second.stock || 0);
        case "name-asc":
        default:
          return first.name.localeCompare(second.name, "es", { sensitivity: "base" });
      }
    });
  }, [products, searchText, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setExpandedRowId(null);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const hasActiveFilters = searchText.trim().length > 0 || sortBy !== "name-asc";

  // ========== RENDER ==========

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 pb-3">
      {/* Barra de búsqueda y filtros */}
      <div className="space-y-3 rounded-[28px] border border-white/8 bg-black/20 px-4 py-4 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_230px_auto]">
          <InputGroup className="h-10 rounded-full border-white/15 bg-black/25 text-white shadow-none">
            <InputGroupAddon className="pl-4 text-white/35">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="h-10 rounded-full border-0 bg-transparent text-white placeholder:text-white/35"
              aria-label="Buscar productos"
            />
          </InputGroup>

          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-full border border-white/15 bg-black/25 px-4 text-sm text-white focus:border-[#822727] focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
                  {opt.label}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              className="h-10 rounded-full border-[#822727]/70 bg-transparent px-4 text-sm font-semibold text-white hover:bg-[#822727]/15 hover:text-white"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-2">
          <div className="text-xs text-white/45">{filteredProducts.length} resultados</div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-3 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setSearchText("");
                setSortBy("name-asc");
              }}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabla de productos */}
      <Card className="min-h-0 flex-1 border-white/10 bg-[#111111]/90 text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-3">
          {error ? (
            <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="scrollbar-invisible min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-[#151515]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#151515]">
                <TableRow className="border-white/10 bg-[#151515] hover:bg-[#151515]">
                  <TableHead className="w-12 text-white/45">
                    <Checkbox aria-label="Seleccionar todos" />
                  </TableHead>
                  <TableHead className="text-white/45">#</TableHead>
                  <TableHead className="text-white/45">Producto</TableHead>
                  <TableHead className="text-white/45">Descripción</TableHead>
                  <TableHead className="text-right text-white/45">Precio</TableHead>
                  <TableHead className="text-right text-white/45">Stock</TableHead>
                  <TableHead className="w-32 text-right text-white/45">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={`loading-row-${index}`} className="border-white/10">
                      <TableCell><Skeleton className="h-4 w-4 rounded-sm bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-white/10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 bg-white/10" /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}

                {!loading && paginatedProducts.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="py-8 text-center text-white/55">
                      No hay productos para mostrar.
                    </TableCell>
                  </TableRow>
                ) : null}

                {paginatedProducts.map((item, index) => {
                  const cardinalId = (currentPage - 1) * rowsPerPage + index + 1;

                  return (
                    <Fragment key={`${item._id || item.id}-group`}>
                      <TableRow className={`border-white/10 hover:bg-white/4 ${expandedRowId === (item._id || item.id) ? "bg-white/4" : ""}`}>
                        <TableCell>
                          <Checkbox aria-label={`Seleccionar ${item.name}`} />
                        </TableCell>
                        <TableCell className="text-white/65">{cardinalId}</TableCell>
                        <TableCell className="font-medium text-white">
                          <span className="inline-flex items-center gap-2">
                            <Box className="h-4 w-4 text-[#822727]" />
                            {item.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-white/65 max-w-xs truncate">
                          {item.description || "-"}
                        </TableCell>
                        <TableCell className="text-right text-white/65">{formatPrice(item.price)}</TableCell>
                        <TableCell className="text-right text-white/65">{item.stock}</TableCell>
                        <TableCell className="w-32 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 rounded-md border border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                              onClick={() => setExpandedRowId((prev) => (prev === (item._id || item.id) ? null : (item._id || item.id)))}
                            >
                              {expandedRowId === (item._id || item.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 rounded-md border border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                              onClick={() => openEditModal(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 rounded-md border border-[#822727]/35 bg-[#822727]/10 text-[#ff8f8f] hover:bg-[#822727]/20 hover:text-[#ffb6b6]"
                              onClick={() => requestDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedRowId === (item._id || item.id) ? (
                        <TableRow className="border-white/10 bg-white/4">
                          <TableCell colSpan={7}>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-white/40">ID</p>
                                <p className="mt-1 text-sm text-white">{item._id || item.id}</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-white/40">Descripción completa</p>
                                <p className="mt-1 text-sm text-white">{item.description || "Sin descripción"}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
            <p className="text-xs text-white/55">
              {filteredProducts.length === 0
                ? "Mostrando 0 de 0"
                : `Mostrando ${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, filteredProducts.length)} de ${filteredProducts.length}`}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((page) => (
                <Button
                  key={page}
                  type="button"
                  variant="outline"
                  className={`h-9 min-w-9 rounded-full border px-3 text-sm ${
                    currentPage === page
                      ? "border-[#822727] bg-[#822727] text-white hover:bg-[#9b2f2f]"
                      : "border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}

              {totalPages > 5 && (
                <span className="px-2 text-white/45">...</span>
              )}

              {totalPages > 5 && (
                <Button
                  key={totalPages}
                  type="button"
                  variant="outline"
                  className={`h-9 min-w-9 rounded-full border px-3 text-sm ${
                    currentPage === totalPages
                      ? "border-[#822727] bg-[#822727] text-white hover:bg-[#9b2f2f]"
                      : "border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Crear Producto */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border border-white/10 bg-[#161616] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription className="text-white/55">
              Completa los datos para crear un nuevo producto en el catálogo.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Nombre <span className="text-red-400">*</span></Label>
              <Input
                id="create-name"
                className="h-11"
                autoComplete="off"
                value={createForm.name}
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }));
                  if (createErrors.name) setCreateErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Ej. Filtro de aceite"
                aria-invalid={!!createErrors.name}
              />
              {createErrors.name && <p className="text-xs text-red-500">{createErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-description">Descripción</Label>
              <textarea
                id="create-description"
                value={createForm.description}
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }));
                  if (createErrors.description) setCreateErrors((prev) => ({ ...prev, description: "" }));
                }}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/30 focus:border-[#822727] focus:outline-none"
                rows="3"
                placeholder="Descripción del producto (opcional)"
              />
              {createErrors.description && <p className="text-xs text-red-500">{createErrors.description}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-price">Precio (USD) <span className="text-red-400">*</span></Label>
                <Input
                  id="create-price"
                  className="h-11"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createForm.price}
                  onChange={(event) => {
                    setCreateForm((prev) => ({ ...prev, price: event.target.value }));
                    if (createErrors.price) setCreateErrors((prev) => ({ ...prev, price: "" }));
                  }}
                  placeholder="0.00"
                  aria-invalid={!!createErrors.price}
                />
                {createErrors.price && <p className="text-xs text-red-500">{createErrors.price}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-stock">Stock <span className="text-red-400">*</span></Label>
                <Input
                  id="create-stock"
                  className="h-11"
                  type="number"
                  step="1"
                  min="0"
                  value={createForm.stock}
                  onChange={(event) => {
                    setCreateForm((prev) => ({ ...prev, stock: event.target.value }));
                    if (createErrors.stock) setCreateErrors((prev) => ({ ...prev, stock: "" }));
                  }}
                  placeholder="0"
                  aria-invalid={!!createErrors.stock}
                />
                {createErrors.stock && <p className="text-xs text-red-500">{createErrors.stock}</p>}
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 px-5 text-black" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-11 bg-[#822727] px-5 text-base hover:bg-[#9b2f2f]">
                {loading ? "Guardando..." : "Guardar producto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Producto */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border border-white/10 bg-[#161616] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription className="text-white/55">
              Modifica los datos del producto.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nombre <span className="text-red-400">*</span></Label>
              <Input
                id="edit-name"
                className="h-11"
                autoComplete="off"
                value={editForm.name}
                onChange={(event) => {
                  setEditForm((prev) => ({ ...prev, name: event.target.value }));
                  if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: "" }));
                }}
                aria-invalid={!!editErrors.name}
              />
              {editErrors.name && <p className="text-xs text-red-500">{editErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Descripción</Label>
              <textarea
                id="edit-description"
                value={editForm.description}
                onChange={(event) => {
                  setEditForm((prev) => ({ ...prev, description: event.target.value }));
                  if (editErrors.description) setEditErrors((prev) => ({ ...prev, description: "" }));
                }}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/30 focus:border-[#822727] focus:outline-none"
                rows="3"
              />
              {editErrors.description && <p className="text-xs text-red-500">{editErrors.description}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-price">Precio (USD) <span className="text-red-400">*</span></Label>
                <Input
                  id="edit-price"
                  className="h-11"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.price}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, price: event.target.value }));
                    if (editErrors.price) setEditErrors((prev) => ({ ...prev, price: "" }));
                  }}
                  aria-invalid={!!editErrors.price}
                />
                {editErrors.price && <p className="text-xs text-red-500">{editErrors.price}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-stock">Stock <span className="text-red-400">*</span></Label>
                <Input
                  id="edit-stock"
                  className="h-11"
                  type="number"
                  step="1"
                  min="0"
                  value={editForm.stock}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, stock: event.target.value }));
                    if (editErrors.stock) setEditErrors((prev) => ({ ...prev, stock: "" }));
                  }}
                  aria-invalid={!!editErrors.stock}
                />
                {editErrors.stock && <p className="text-xs text-red-500">{editErrors.stock}</p>}
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 px-5 text-black" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-11 bg-[#822727] px-5 text-base hover:bg-[#9b2f2f]">
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <AlertDialogContent className="border border-white/10 bg-[#161616] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              {`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-transparent border-t-0">
            <AlertDialogCancel variant="outline" className="text-black hover:text-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-[#822727] hover:bg-[#9b2f2f]" onClick={confirmDelete}>
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Products;
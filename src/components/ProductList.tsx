import React, { useState, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Box,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  QrCodeScanner
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { BarcodeScanner } from './BarcodeScanner';
import type { Product } from '../types/index';

interface ProductListProps {
  headerAction?: React.ReactNode;
}

type EditableField = 'name' | 'barcode' | 'price' | 'stock' | 'costPrice' | 'purchasedQuantity';
type EditableValue = string | number | undefined;

export const ProductList: React.FC<ProductListProps> = ({ headerAction }) => {
  const { products, updateProduct, deleteProduct, getProductByBarcode } = useApp();
  const [editingField, setEditingField] = useState<{productId: string; field: EditableField} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: ''
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const getUnitCost = (costPrice?: number, purchasedQuantity?: number) => {
    if (typeof costPrice !== 'number' || typeof purchasedQuantity !== 'number' || purchasedQuantity <= 0) {
      return null;
    }

    return costPrice / purchasedQuantity;
  };

  const getStockColor = (product: { stock: number; purchasedQuantity?: number }) => {
    const { stock, purchasedQuantity } = product;
    if (purchasedQuantity && purchasedQuantity > 0) {
      const ratio = stock / purchasedQuantity;
      if (stock <= 0) return 'error';
      if (ratio <= 0.2) return 'warning';
      return 'success';
    }

    if (stock > 10) return 'success';
    if (stock > 0) return 'warning';
    return 'error';
  };

  const showError = (title: string, message: string) => {
    setErrorDialog({ open: true, title, message });
  };

  const filteredProducts = useMemo(() => {
    const filtered = !searchTerm 
      ? products 
      : products.filter(product => {
          const lowerSearch = searchTerm.toLowerCase();
          return product.name.toLowerCase().includes(lowerSearch) ||
            (product.barcode && product.barcode.toLowerCase().includes(lowerSearch));
        });
    
    // Ordena os produtos alfabeticamente pelo nome
    return [...filtered].sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  }, [products, searchTerm]);

  const handleFieldClick = (productId: string, field: EditableField, currentValue: EditableValue) => {
    setEditingField({ productId, field });
    
    if (field === 'price' || field === 'costPrice') {
      setEditValue(currentValue ? currentValue.toString() : '');
    } else if (field === 'stock' || field === 'purchasedQuantity') {
      setEditValue(currentValue ? currentValue.toString() : '');
    } else {
      setEditValue(String(currentValue ?? ''));
    }
  };

  const handleFieldSave = () => {
    if (!editingField) return;
    
    const { productId, field } = editingField;
    let value: EditableValue = editValue.trim();
    
    if (field === 'price' || field === 'costPrice') {
      if (value === '') {
        value = field === 'costPrice' ? undefined : 0;
      } else {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          showError('Valor Inválido', 'Preço deve ser um número válido maior ou igual a zero.');
          return;
        }
        value = numValue;
      }
    } else if (field === 'stock' || field === 'purchasedQuantity') {
      if (value === '') {
        value = field === 'purchasedQuantity' ? undefined : 0;
      } else {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0) {
          showError('Valor Inválido', 'Quantidade deve ser um número inteiro maior ou igual a zero.');
          return;
        }
        value = numValue;
      }
    } else if (field === 'name' && !value) {
      showError('Campo Obrigatório', 'Nome do produto não pode estar vazio.');
      return;
    } else if (field === 'barcode') {
      if (value === '') {
        value = undefined;
      } else {
        // Verificar se já existe outro produto com este código de barras
          const existingProduct = products.find((p: Product) =>
            p.id !== productId && // Não verificar o próprio produto
            p.barcode === value
          );
        
        if (existingProduct) {
          showError(
            'Código Duplicado',
            `O código de barras "${value}" já está sendo usado pelo produto "${existingProduct.name}". Cada produto deve ter um código único.`
          );
          return;
        }
      }
    }
    
    updateProduct(productId, { [field]: value });
    setEditingField(null);
    setEditValue('');
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteProduct(productToDelete);
      setProductToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setProductToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleScan = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    setSearchTerm(product?.barcode || barcode);
    setShowScanner(false);
  };

  return (
    <>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Campo de busca */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Buscar por nome ou código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowScanner(true)}
                  edge="end"
                  aria-label="abrir scanner de código de barras"
                >
                  <QrCodeScanner />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            flex: '1 1 420px',
            minWidth: 280,
            bgcolor: 'background.paper',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />
        {headerAction}
      </Box>

      {products.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 300,
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3
        }}>
          <Typography variant="body1" color="text.secondary">
            Nenhum produto cadastrado ainda
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'surface.variant' }}>
                <TableCell sx={{ fontWeight: 600, width: '15%' }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '24%' }}>Produto</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Qtd Comprada</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Custo</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '11%' }}>Valor Unitário</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Preço</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '12%' }}>Estoque</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '8%' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                {/* Código de Barras */}
                <TableCell sx={{ width: '15%' }}>
                  {editingField?.productId === product.id && editingField?.field === 'barcode' ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFieldSave}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleFieldSave();
                        if (e.key === 'Escape') handleFieldCancel();
                      }}
                      autoFocus
                      variant="standard"
                      sx={{ 
                        '& .MuiInput-root': { 
                          fontSize: '0.875rem',
                          padding: '2px 0'
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      onClick={() => handleFieldClick(product.id, 'barcode', product.barcode)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 0.5, borderRadius: 1, display: 'inline-block' }}
                    >
                      {product.barcode || '-'}
                    </Typography>
                  )}
                </TableCell>

                {/* Nome do Produto */}
                <TableCell component="th" scope="row" sx={{ width: '24%' }}>
                  {editingField?.productId === product.id && editingField?.field === 'name' ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFieldSave}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleFieldSave();
                        if (e.key === 'Escape') handleFieldCancel();
                      }}
                      autoFocus
                      variant="standard"
                      sx={{ 
                        '& .MuiInput-root': { 
                          fontSize: '0.875rem',
                          padding: '2px 0'
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body2" 
                      fontWeight={500}
                      onClick={() => handleFieldClick(product.id, 'name', product.name)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 0.5, borderRadius: 1, display: 'inline-block' }}
                    >
                      {product.name}
                    </Typography>
                  )}
                </TableCell>

                {/* Quantidade Comprada */}
                <TableCell sx={{ width: '10%' }}>
                  {editingField?.productId === product.id && editingField?.field === 'purchasedQuantity' ? (
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFieldSave}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleFieldSave();
                        if (e.key === 'Escape') handleFieldCancel();
                      }}
                      autoFocus
                      variant="standard"
                      sx={{ 
                        '& .MuiInput-root': { 
                          fontSize: '0.875rem',
                          padding: '2px 0'
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      onClick={() => handleFieldClick(product.id, 'purchasedQuantity', product.purchasedQuantity)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 0.5, borderRadius: 1, display: 'inline-block' }}
                    >
                      {product.purchasedQuantity || '-'}
                    </Typography>
                  )}
                </TableCell>

                {/* Preço de Custo */}
                <TableCell sx={{ width: '10%' }}>
                  {editingField?.productId === product.id && editingField?.field === 'costPrice' ? (
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFieldSave}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleFieldSave();
                        if (e.key === 'Escape') handleFieldCancel();
                      }}
                      autoFocus
                      variant="standard"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>
                      }}
                      sx={{ 
                        '& .MuiInput-root': { 
                          fontSize: '0.875rem',
                          padding: '2px 0'
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      onClick={() => handleFieldClick(product.id, 'costPrice', product.costPrice)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 0.5, borderRadius: 1, display: 'inline-block' }}
                    >
                      {product.costPrice ? formatCurrency(product.costPrice) : '-'}
                    </Typography>
                  )}
                </TableCell>

                <TableCell sx={{ width: '11%' }}>
                  <Typography variant="body2" color="text.secondary">
                    {getUnitCost(product.costPrice, product.purchasedQuantity) !== null
                      ? formatCurrency(getUnitCost(product.costPrice, product.purchasedQuantity) as number)
                      : '-'}
                  </Typography>
                </TableCell>

                {/* Preço de Venda */}
                <TableCell sx={{ width: '10%' }}>
                  {editingField?.productId === product.id && editingField?.field === 'price' ? (
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFieldSave}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleFieldSave();
                        if (e.key === 'Escape') handleFieldCancel();
                      }}
                      autoFocus
                      variant="standard"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>
                      }}
                      sx={{ 
                        '& .MuiInput-root': { 
                          fontSize: '0.875rem',
                          padding: '2px 0'
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body2" 
                      fontWeight={500}
                      onClick={() => handleFieldClick(product.id, 'price', product.price)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 0.5, borderRadius: 1, display: 'inline-block' }}
                    >
                      {formatCurrency(product.price)}
                    </Typography>
                  )}
                </TableCell>

                {/* Estoque */}
                <TableCell sx={{ width: '12%' }}>
                  {editingField?.productId === product.id && editingField?.field === 'stock' ? (
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleFieldSave}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleFieldSave();
                        if (e.key === 'Escape') handleFieldCancel();
                      }}
                      autoFocus
                      variant="standard"
                      sx={{ 
                        '& .MuiInput-root': { 
                          fontSize: '0.875rem',
                          padding: '2px 0'
                        }
                      }}
                    />
                  ) : (
                    <Box 
                      onClick={() => handleFieldClick(product.id, 'stock', product.stock)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 0.5, borderRadius: 1, display: 'inline-block' }}
                    >
                      <Chip 
                        label={`${product.stock} unidades`}
                        color={getStockColor(product)}
                        size="small"
                        sx={{ borderRadius: 2 }}
                      />
                    </Box>
                  )}
                </TableCell>

                {/* Ações */}
                <TableCell>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick(product.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredProducts.length === 0 && products.length > 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum produto encontrado com "{searchTerm}"
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}
    </Box>
    
    <Dialog
      open={deleteDialogOpen}
      onClose={handleDeleteCancel}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <DialogTitle id="delete-dialog-title">
        Confirmar Exclusão
      </DialogTitle>
      <DialogContent>
        <Typography id="delete-dialog-description">
          Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDeleteCancel} color="secondary">
          Cancelar
        </Button>
        <Button onClick={handleDeleteConfirm} color="error" variant="contained">
          Excluir
        </Button>
      </DialogActions>
    </Dialog>

    {showScanner && (
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    )}

    {/* Diálogo de Erro */}
    <Dialog
      open={errorDialog.open}
      onClose={() => setErrorDialog({ open: false, title: '', message: '' })}
      aria-labelledby="error-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle 
        id="error-dialog-title"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: 'error.main',
          pb: 1 
        }}
      >
        ⚠️ {errorDialog.title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          {errorDialog.message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={() => setErrorDialog({ open: false, title: '', message: '' })}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 4 }}
        >
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
  InputAdornment,
  Box,
  Typography
} from '@mui/material';
import {
  Close as CloseIcon,
  QrCodeScanner
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { BarcodeScanner } from './BarcodeScanner';

interface ProductFormProps {
  onClose: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ onClose }) => {
  const { addProduct, products } = useApp();
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [purchasedQuantity, setPurchasedQuantity] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: ''
  });

  const showError = (title: string, message: string) => {
    setErrorDialog({ open: true, title, message });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!name || !price || !purchasedQuantity) {
      showError('Campos Obrigatórios', 'Nome, preço e quantidade comprada são obrigatórios.');
      return;
    }
    
    // Validar código de barras único (se fornecido)
    if (barcode && barcode.trim()) {
      const existingProduct = products.find(p => p.barcode === barcode.trim());
      if (existingProduct) {
        showError(
          'Código Duplicado', 
          `O código de barras "${barcode}" já está sendo usado pelo produto "${existingProduct.name}". Cada produto deve ter um código único.`
        );
        return;
      }
    }
    
    addProduct({
      name,
      barcode: barcode || undefined,
      price: parseFloat(price),
      stock: parseInt(purchasedQuantity),
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      purchasedQuantity: parseInt(purchasedQuantity)
    });
    onClose();
  };

  const handleScan = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setShowScanner(false);
  };

  return (
    <>
      <Dialog 
        open 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          Cadastrar Produto
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={3}>
              <TextField
                label="Nome do Produto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <Box>
                <TextField
                  label="Código de Barras"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  fullWidth
                  variant="outlined"
                  InputProps={{
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
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Box>

              <TextField
                label="Preço de Venda"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
                required
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                inputProps={{
                  step: '0.01',
                  min: '0'
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <TextField
                label="Custo Total (opcional)"
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                fullWidth
                variant="outlined"
                helperText="Valor total pago no lote comprado"
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                inputProps={{
                  step: '0.01',
                  min: '0'
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              <Box>
                <TextField
                  label="Qtd. Comprada"
                  type="number"
                  value={purchasedQuantity}
                  onChange={(e) => setPurchasedQuantity(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  helperText="Esse valor será usado como estoque inicial do produto"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">unidades</InputAdornment>,
                  }}
                  inputProps={{
                    min: '0'
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={onClose}
              variant="outlined"
              sx={{ borderRadius: 4 }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              variant="contained"
              sx={{ borderRadius: 4 }}
            >
              Cadastrar
            </Button>
          </DialogActions>
        </form>
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

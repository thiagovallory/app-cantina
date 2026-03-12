import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert
} from '@mui/material';

interface BarcodeInputProps {
  open: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({ open, onScan, onClose }) => {
  const [barcode, setBarcode] = useState('');

  const handleSubmit = () => {
    if (barcode.trim()) {
      onScan(barcode.trim());
      setBarcode('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle>Digite o Código de Barras</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              Digite o código de barras manualmente ou use um leitor de código externo.
            </Typography>
          </Alert>
        </Box>
        
        <TextField
          fullWidth
          label="Código de Barras"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite ou cole o código aqui..."
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 4 }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!barcode.trim()}
          sx={{ borderRadius: 4 }}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
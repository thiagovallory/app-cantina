import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Avatar,
  Stack,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera,
  Person as PersonIcon
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';

interface PersonFormProps {
  onClose: () => void;
}

export const PersonForm: React.FC<PersonFormProps> = ({ onClose }) => {
  const { addPerson } = useApp();
  const [customId, setCustomId] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && initialDeposit) {
      addPerson({
        customId: customId.trim() || undefined,
        name,
        photo,
        initialDeposit: parseFloat(initialDeposit),
        balance: parseFloat(initialDeposit)
      });
      onClose();
    }
  };

  return (
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
        Cadastrar Pessoa
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={photo}
                  sx={{ 
                    width: 100, 
                    height: 100,
                    bgcolor: photo ? 'transparent' : 'primary.light'
                  }}
                >
                  {!photo && <PersonIcon sx={{ fontSize: 50 }} />}
                </Avatar>
                <label htmlFor="photo-upload">
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                  <IconButton
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      width: 35,
                      height: 35
                    }}
                  >
                    <PhotoCamera fontSize="small" />
                  </IconButton>
                </label>
              </Box>
            </Box>

            <TextField
              label="ID da Pessoa (opcional)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Ex: 001, A123, João001..."
              helperText="ID único para busca rápida (deixe vazio para não usar)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            <TextField
              label="Nome"
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

            <TextField
              label="Depósito Inicial"
              type="number"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
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
  );
};
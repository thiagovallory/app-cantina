import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Refresh as RefreshIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';

interface BrandingSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({ open, onClose }) => {
  const { branding, updateBranding } = useApp();
  const safeMissionaryGoal = typeof branding.missionaryGoal === 'number' ? branding.missionaryGoal : 0;
  const [organizationName, setOrganizationName] = useState(branding.organizationName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [showLogo, setShowLogo] = useState(branding.showLogo);
  const [darkMode, setDarkMode] = useState(branding.darkMode);
  const [missionaryGoal, setMissionaryGoal] = useState(safeMissionaryGoal.toString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setOrganizationName(branding.organizationName);
    setLogoUrl(branding.logoUrl);
    setShowLogo(branding.showLogo);
    setDarkMode(branding.darkMode);
    setMissionaryGoal(safeMissionaryGoal.toString());
  }, [open, branding.organizationName, branding.logoUrl, branding.showLogo, branding.darkMode, safeMissionaryGoal]);

  const handleSave = async () => {
    await updateBranding({
      organizationName,
      logoUrl,
      showLogo,
      darkMode,
      missionaryGoal: parseFloat(missionaryGoal) || 0
    });
    onClose();
  };

  const handleCancel = () => {
    // Resetar para valores originais
    setOrganizationName(branding.organizationName);
    setLogoUrl(branding.logoUrl);
    setShowLogo(branding.showLogo);
    setDarkMode(branding.darkMode);
    setMissionaryGoal(safeMissionaryGoal.toString());
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Criar URL do arquivo local
      const fileUrl = URL.createObjectURL(file);
      setLogoUrl(fileUrl);
    }
  };

  const handleUseDefaultLogo = () => {
    setLogoUrl('/LOGO.png');
  };

  const resetToDefaults = () => {
    setOrganizationName('Acampamento de Jovens 2025');
    setLogoUrl('/LOGO.png');
    setShowLogo(true);
    setDarkMode(false);
    setMissionaryGoal('0');
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleCancel}
        maxWidth="md"
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
          ⚙️ Configurações de Identidade Visual
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure o nome da organização e logotipo que aparecerão nos relatórios e cabeçalho da aplicação.
          </Typography>

          <Stack spacing={3}>
            {/* Nome da Organização */}
            <TextField
              label="Nome da Organização"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              fullWidth
              variant="outlined"
              helperText="Este nome aparecerá nos relatórios e no cabeçalho"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            <TextField
              label="Meta de Oferta Missionária"
              value={missionaryGoal}
              onChange={(e) => setMissionaryGoal(e.target.value)}
              type="number"
              fullWidth
              variant="outlined"
              helperText="Valor usado no indicador de progresso do topo"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>
              }}
              inputProps={{
                min: '0',
                step: '0.01'
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            <Divider />

            {/* Logo Settings */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Logotipo
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                  />
                }
                label="Mostrar logotipo nos relatórios"
                sx={{ mb: 2 }}
              />

              {showLogo && (
                <Stack spacing={2}>
                  {/* Preview do Logo */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
                  }}>
                    <Box sx={{
                      width: 100,
                      height: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: theme => theme.palette.mode === 'dark' ? 'grey.800' : 'white',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      {logoUrl ? (
                        <img 
                          src={logoUrl}
                          alt="Logo Preview"
                          style={{ 
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <Typography variant="h4" color="text.secondary">📋</Typography>
                      )}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      {/* URL do Logo */}
                      <TextField
                        label="URL do Logotipo"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        fullWidth
                        variant="outlined"
                        helperText="Caminho para o arquivo de imagem (ex: /logo.png)"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          },
                          marginTop: 2
                        }}
                      />
                    </Box>
                  </Box>


                  {/* Botões de Ação */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ borderRadius: 4 }}
                    >
                      Enviar Imagem
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={handleUseDefaultLogo}
                      sx={{ borderRadius: 4 }}
                    >
                      Usar Logo Padrão
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Modo Escuro */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Aparência
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {darkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                    <Typography>{darkMode ? 'Modo Escuro' : 'Modo Claro'}</Typography>
                  </Box>
                }
              />
            </Box>

            <Divider />

            {/* Botão Reset */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="text"
                startIcon={<RefreshIcon />}
                onClick={resetToDefaults}
                sx={{ borderRadius: 4 }}
              >
                Restaurar Configurações Padrão
              </Button>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCancel}
            variant="outlined"
            sx={{ borderRadius: 4 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            sx={{ borderRadius: 4 }}
          >
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Input para upload de arquivo */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </>
  );
};

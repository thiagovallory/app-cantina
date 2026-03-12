import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  Stack,
  Paper,
  IconButton,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Sync as SyncIcon,
  CloudDownload as CloudDownloadIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';

interface DataSyncProps {
  open: boolean;
  onClose: () => void;
}

export const DataSync: React.FC<DataSyncProps> = ({ open, onClose }) => {
  const { people, products, branding, exportAllData, importAllData } = useApp();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cantina-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const text = await file.text();
      const result = await importAllData(text);
      
      if (result.success) {
        setImportSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setImportError(result.error || 'Erro ao importar dados');
      }
    } catch (error) {
      setImportError('Erro ao ler o arquivo');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setImportError(null);
    setImportSuccess(false);
    onClose();
  };

  const dataStats = {
    people: people.length,
    products: products.length,
    totalPurchases: people.reduce((sum, p) => sum + p.purchases.length, 0),
    totalBalance: people.reduce((sum, p) => sum + p.balance, 0)
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
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
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon />
          <Typography variant="h6">
            Sincronização de Dados
          </Typography>
        </Box>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              Use esta funcionalidade para compartilhar dados entre dispositivos na rede. 
              Exporte os dados do dispositivo principal e importe no outro dispositivo.
            </Typography>
          </Alert>

          {importing && (
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Importando dados...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {importError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {importError}
            </Alert>
          )}

          {importSuccess && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Dados importados com sucesso! A página será recarregada em breve.
            </Alert>
          )}

          <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudDownloadIcon color="primary" />
              Dados Atuais do Sistema
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                label={`${dataStats.people} Pessoas`}
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`${dataStats.products} Produtos`}
                color="secondary"
                variant="outlined"
              />
              <Chip 
                label={`${dataStats.totalPurchases} Compras`}
                color="info"
                variant="outlined"
              />
              <Chip 
                label={`Saldo Total: R$ ${dataStats.totalBalance.toFixed(2)}`}
                color="success"
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" color="text.secondary">
              Organização: {branding.organizationName || 'Não configurada'}
            </Typography>
          </Paper>

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Paper sx={{ flex: 1, p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DownloadIcon color="primary" />
                Exportar Dados
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Baixe um arquivo com todos os dados atuais (pessoas, produtos, configurações).
              </Typography>
              <Button
                fullWidth
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportData}
                sx={{ borderRadius: 2 }}
              >
                Exportar Backup
              </Button>
            </Paper>

            <Paper sx={{ flex: 1, p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <UploadIcon color="warning" />
                Importar Dados
              </Typography>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <WarningIcon fontSize="small" />
                  <Typography variant="body2">
                    <strong>Atenção:</strong> Esta ação substituirá todos os dados atuais!
                  </Typography>
                </Box>
              </Alert>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <Button
                fullWidth
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                sx={{ borderRadius: 2 }}
              >
                Selecionar Arquivo
              </Button>
            </Paper>
          </Box>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Como sincronizar:</strong>
              <br />
              1. No dispositivo com os dados, clique em "Exportar Backup"
              <br />
              2. Transfira o arquivo para o outro dispositivo
              <br />
              3. No outro dispositivo, clique em "Selecionar Arquivo" e escolha o backup
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

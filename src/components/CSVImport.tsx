import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack
} from '@mui/material';
import {
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import Papa from 'papaparse';
import { useApp } from '../context/AppContext';
import { detectCsvImportType, PRODUCT_FIELD_ALIASES } from '../lib/csvSchemas';

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
  type?: 'products' | 'people' | 'auto';
}

interface ImportResults {
  success: boolean;
  imported?: number;
  updated?: number;
  errors?: string[];
}

// ConflictDialog removed - using window.confirm instead for simplicity

export const CSVImport: React.FC<CSVImportProps> = ({ open, onClose, type = 'auto' }) => {
  const { importProductsFromCSV, importPeopleFromCSV } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setResults({
        success: false,
        errors: ['Por favor, selecione um arquivo CSV']
      });
      return;
    }

    setIsProcessing(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        if (result.errors.length > 0) {
          setResults({
            success: false,
            errors: result.errors.map(err => `${err.message} (linha ${err.row})`)
          });
          setIsProcessing(false);
          return;
        }

        try {
          let importResults;
          const rows = result.data as Record<string, unknown>[];
          const headers = result.meta.fields || [];
          const detectedType = type === 'auto' ? detectCsvImportType(headers) : type;

          if (!detectedType) {
            setResults({
              success: false,
              errors: ['Não foi possível identificar se o arquivo é de pessoas ou produtos pelos cabeçalhos.']
            });
            setIsProcessing(false);
            return;
          }

          if (!window.confirm(`Deseja importar ${rows.length} ${detectedType === 'products' ? 'produtos' : 'pessoas'}?`)) {
            setIsProcessing(false);
            return;
          }

          if (detectedType === 'products') {
            importResults = await importProductsFromCSV(
              rows,
              (product, existing) => {
                const nextBarcode = String(getProductCsvValue(product, [...PRODUCT_FIELD_ALIASES.barcode]) ?? '');
                const nextStock = String(getProductCsvValue(product, [...PRODUCT_FIELD_ALIASES.stock]) ?? 0);
                const nextPriceValue = getProductCsvValue(product, [...PRODUCT_FIELD_ALIASES.price]);
                const nextPrice = parseFloat(String(nextPriceValue ?? '0').replace(',', '.'));
                return window.confirm(
                  `Produto "${existing.name}" (código ${existing.barcode}) já existe.\n` +
                  `Existente: R$ ${existing.price.toFixed(2)} - Estoque: ${existing.stock}\n` +
                  `Novo: Código ${nextBarcode || '-'} - R$ ${nextPrice.toFixed(2)} - Estoque: ${nextStock}\n\n` +
                  'Deseja atualizar com os dados do CSV?'
                );
              }
            );
          } else {
            importResults = await importPeopleFromCSV(rows);
          }

          setResults({
            success: true,
            ...importResults
          });
        } catch (error) {
          setResults({
            success: false,
            errors: [error instanceof Error ? error.message : 'Erro desconhecido']
          });
        }
        
        setIsProcessing(false);
      },
      error: (error) => {
        setResults({
          success: false,
          errors: [error.message]
        });
        setIsProcessing(false);
      }
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClose = () => {
    setResults(null);
    onClose();
  };

  const handleImportMore = () => {
    setResults(null);
    fileInputRef.current?.click(); // Open file input again to import more data
  };

  const getProductCsvValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }

    return undefined;
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Importar CSV
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            {!results && (
              <>
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2">
                    Selecione um arquivo CSV. O sistema identifica automaticamente se ele é de pessoas ou de produtos e pede confirmação antes de importar.
                  </Typography>
                </Alert>

                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragging ? 'success.main' : 'primary.main',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragging ? 'action.hover' : 'transparent',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <UploadIcon sx={{ fontSize: 48, color: isDragging ? 'success.main' : 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {isDragging ? 'Solte o arquivo aqui' : 'Clique aqui para selecionar arquivo CSV'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isDragging ? 'Arquivo detectado!' : 'Ou arraste e solte o arquivo aqui'}
                  </Typography>
                </Box>

              </>
            )}

            {isProcessing && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Processando arquivo...
                </Typography>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Aguarde enquanto importamos os dados
                </Typography>
              </Box>
            )}

            {results && (
              <Box>
                {results.success ? (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    <Typography variant="h6" gutterBottom>
                      Importação Concluída!
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      {(results.imported ?? 0) > 0 && (
                        <Chip 
                          label={`${results.imported ?? 0} registros importados`}
                          color="success"
                          size="small"
                        />
                      )}
                      {(results.updated ?? 0) > 0 && (
                        <Chip 
                          label={`${results.updated ?? 0} produtos atualizados`}
                          color="info"
                          size="small"
                        />
                      )}
                    </Stack>
                  </Alert>
                ) : (
                  <Alert severity="error" icon={<ErrorIcon />}>
                    <Typography variant="h6" gutterBottom>
                      Erro na Importação
                    </Typography>
                  </Alert>
                )}

                {results.errors && results.errors.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Erros encontrados:
                    </Typography>
                    <List dense>
                      {results.errors.map((error: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={error}
                            sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <DialogActions>
          <Button onClick={handleClose}>
            {results ? 'Fechar' : 'Cancelar'}
          </Button>
          {results && results.success && (
            <Button
              variant="contained"
              onClick={() => handleImportMore()}
              disabled={isProcessing}
            >
              Importar Outro CSV
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

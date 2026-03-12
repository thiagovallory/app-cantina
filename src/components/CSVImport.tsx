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

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
  type: 'products' | 'people';
}

// ConflictDialog removed - using window.confirm instead for simplicity

export const CSVImport: React.FC<CSVImportProps> = ({ open, onClose, type }) => {
  const { importProductsFromCSV, importPeopleFromCSV } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
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
          
          if (type === 'products') {
            importResults = await importProductsFromCSV(
              result.data, 
              (product, existing) => {
                return window.confirm(
                  `Produto "${existing.name}" (código ${existing.barcode}) já existe.\n` +
                  `Existente: R$ ${existing.price.toFixed(2)} - Estoque: ${existing.stock}\n` +
                  `Novo: R$ ${parseFloat(product.price).toFixed(2)} - Estoque: ${product.stock || 0}\n\n` +
                  'Deseja atualizar com os dados do CSV?'
                );
              }
            );
          } else {
            importResults = await importPeopleFromCSV(result.data);
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

  const getExampleFormat = () => {
    if (type === 'products') {
      return {
        headers: ['name ou Produto', 'barcode ou Código', 'price ou Preço', 'stock ou Estoque'],
        example: ['Coca-Cola 350ml', '7894900011517', '3.50', '50']
      };
    } else {
      return {
        headers: ['ID Personalizado', 'Nome', 'Saldo Atual', 'Depósito Inicial'],
        example: ['A001', 'João Silva', '50.00', '50.00']
      };
    }
  };

  const format = getExampleFormat();

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Importar {type === 'products' ? 'Produtos' : 'Pessoas'} por CSV
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            {!results && (
              <>
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2">
                    <strong>Formato esperado do CSV:</strong><br />
                    Cabeçalhos: {format.headers.join(', ')}<br />
                    Exemplo: {format.example.join(', ')}
                  </Typography>
                </Alert>

                {type === 'products' && (
                  <Alert severity="warning">
                    <Typography variant="body2">
                      Aceita CSV com separador por vírgula ou ponto e vírgula.
                      Se um produto com o mesmo código de barras já existir, 
                      você será perguntado se deseja atualizar as informações.
                    </Typography>
                  </Alert>
                )}

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
                      {results.imported > 0 && (
                        <Chip 
                          label={`${results.imported} ${type === 'products' ? 'produtos' : 'pessoas'} importados`}
                          color="success"
                          size="small"
                        />
                      )}
                      {results.updated > 0 && (
                        <Chip 
                          label={`${results.updated} produtos atualizados`}
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
              Importar Mais {type === 'products' ? 'Produtos' : 'Pessoas'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

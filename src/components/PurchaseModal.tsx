import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  Search,
  QrCodeScanner,
  Add,
  Remove,
  ShoppingCart,
  Delete,
  Person as PersonIcon,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import type { Person, PurchaseItem } from '../types/index';
import { BarcodeScanner } from './BarcodeScanner';

interface PurchaseModalProps {
  person: Person;
  onClose: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ person, onClose }) => {
  const MISSIONARY_OFFER_ITEM_ID = 'missionary-offer';
  const { products, addPurchase, getProductByBarcode } = useApp();
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [missionaryOfferAmount, setMissionaryOfferAmount] = useState('');
  const normalizeCurrency = (value: number) => Math.round(value * 100) / 100;
  const normalizedBalance = normalizeCurrency(person.balance);

  const filteredProducts = products.filter(p => {
    // Primeiro filtra produtos com estoque
    if (p.stock <= 0) return false;
    
    // Extrai apenas o código de barras da busca, ignorando quantidade (ex: "2*123" -> "123")
    const quantityMatch = searchTerm.trim().match(/^(\d+)\*(.+)$/);
    const searchCode = quantityMatch ? quantityMatch[2] : searchTerm;
    
    return p.name.toLowerCase().includes(searchCode.toLowerCase()) ||
           p.barcode?.includes(searchCode);
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const getProductFromBarcode = (barcode: string) => getProductByBarcode(barcode.trim());

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) {
      alert(`Produto sem estoque: ${product.name}`);
      return;
    }

    const existingItem = cartItems.find(item => item.productId === productId);
    
    if (existingItem) {
      updateQuantity(productId, existingItem.quantity + 1);
    } else {
      const newItem: PurchaseItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: Math.round(product.price * 100) / 100
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const addMissionaryOfferToCart = () => {
    const amount = parseFloat(missionaryOfferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor válido para a oferta missionária.');
      return;
    }

    const newItem: PurchaseItem = {
      productId: MISSIONARY_OFFER_ITEM_ID,
      productName: 'Oferta Missionária',
      quantity: 1,
      price: amount,
      total: Math.round(amount * 100) / 100
    };

    setCartItems(prev => {
      const existingItem = prev.find(item => item.productId === MISSIONARY_OFFER_ITEM_ID);
      if (existingItem) {
        return prev.map(item => (
          item.productId === MISSIONARY_OFFER_ITEM_ID
            ? newItem
            : item
        ));
      }

      return [newItem, ...prev];
    });

    setMissionaryOfferAmount('');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter(item => item.productId !== productId));
    } else {
      if (productId === MISSIONARY_OFFER_ITEM_ID) {
        return;
      }

      const product = products.find(p => p.id === productId);
      if (!product || quantity > product.stock) return;
      
      setCartItems(cartItems.map(item => 
        item.productId === productId
          ? { ...item, quantity, total: Math.round(item.price * quantity * 100) / 100 }
          : item
      ));
    }
  };

  const getTotalAmount = () => {
    const total = cartItems.reduce((sum, item) => sum + item.total, 0);
    // Arredonda para 2 casas decimais para evitar problemas de precisão
    return Math.round(total * 100) / 100;
  };

  const handlePurchase = useCallback(async () => {
    if (cartItems.length === 0) return;
    
    const total = getTotalAmount();
    const balance = Math.round(person.balance * 100) / 100;
    
    // Adiciona uma pequena tolerância para evitar erros de arredondamento (0.001 = 0.1 centavo)
    if (total > balance + 0.001) {
      alert(`Saldo insuficiente! Total: ${formatCurrency(total)}, Saldo: ${formatCurrency(balance)}`);
      return;
    }

    try {
      await addPurchase(person.id, cartItems.map(item => ({
        ...item,
        productId: item.productId === MISSIONARY_OFFER_ITEM_ID ? '' : item.productId
      })));
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao registrar compra');
    }
  }, [addPurchase, cartItems, onClose, person.balance, person.id]);

  const handleScan = (barcode: string) => {
    const product = getProductFromBarcode(barcode);
    if (product) {
      if (product.stock <= 0) {
        alert(`Produto sem estoque: ${product.name}`);
        setShowScanner(false);
        return;
      }
      addToCart(product.id);
      setShowScanner(false);
    } else {
      alert('Produto não encontrado com o código: ' + barcode);
    }
  };

  // Handler para Enter no campo de busca
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const input = searchTerm.trim();
      
      // Verifica se tem o padrão de quantidade (ex: 2*codigo, 10*codigo)
      const quantityMatch = input.match(/^(\d+)\*(.+)$/);
      
      if (quantityMatch) {
        // Extrai quantidade e código
        const quantity = parseInt(quantityMatch[1]);
        const barcode = quantityMatch[2].trim();
        
        const product = getProductFromBarcode(barcode);
        if (product) {
          // Verifica se tem estoque suficiente
          if (quantity > product.stock) {
            alert(`Estoque insuficiente! Disponível: ${product.stock} unidades`);
            return;
          }
          
          // Adiciona a quantidade especificada
          const existingItem = cartItems.find(item => item.productId === product.id);
          
          if (existingItem) {
            // Item já existe no carrinho, soma as quantidades
            const newQuantity = existingItem.quantity + quantity;
            
            if (newQuantity > product.stock) {
              alert(`Estoque insuficiente! Disponível: ${product.stock}, já no carrinho: ${existingItem.quantity}`);
              return;
            }
            
            updateQuantity(product.id, newQuantity);
          } else {
            // Item não existe no carrinho, cria novo
            const newItem = {
              productId: product.id,
              productName: product.name,
              quantity: quantity,
              price: product.price,
              total: Math.round(product.price * quantity * 100) / 100
            };
            setCartItems([...cartItems, newItem]);
          }
          setSearchTerm(''); // Limpa o campo após adicionar
        } else {
          alert(`Produto não encontrado com o código: ${barcode}`);
        }
      } else {
        // Verifica se é um código de barras simples (quantidade 1)
        const product = getProductFromBarcode(input);
        if (product) {
          if (product.stock <= 0) {
            alert(`Produto sem estoque: ${product.name}`);
            return;
          }
          addToCart(product.id);
          setSearchTerm(''); // Limpa o campo após adicionar
        }
      }
    }
  };

  const balanceColor = React.useMemo(() => {
    if (normalizedBalance <= 0) return 'error.main';
    
    if (person.initialDeposit > 0) {
      const ratio = normalizedBalance / person.initialDeposit;
      if (ratio <= 0.2) {
        return 'warning.main';
      }
    }

    return 'success.main';
  }, [normalizedBalance, person.initialDeposit]);

  return (
    <>
      <Dialog 
        open 
        onClose={onClose} 
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            handlePurchase();
          }
        }}
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 2,
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle
          sx={{ 
            position: 'relative',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            py: 2,
            pr: 7
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                alignItems: 'stretch', 
                gap: 3
              }}
            >
              <Box sx={{ minWidth: 0, flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={person.photo}
                  sx={{ 
                    width: 64, 
                    height: 64,
                    bgcolor: person.photo ? 'transparent' : 'primary.light'
                  }}
                >
                  {!person.photo && <PersonIcon sx={{ fontSize: 32 }} />}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Nova compra para
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ fontWeight: 600, color: 'primary.main' }}
                  >
                    {person.name}
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                    {person.customId && (
                      <Typography variant="caption" color="text.secondary">
                        ID: {person.customId}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {person.purchases.length} {person.purchases.length === 1 ? 'compra realizada' : 'compras realizadas'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Grid 
                container 
                spacing={2} 
                sx={{ flex: '1 1 360px', minWidth: 320 }}
              >
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ 
                    borderRadius: 2, 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText',
                    width: 160
                  }}>
                    <CardContent sx={{ py: 1.5, px: 2, minHeight: 102, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                        <AccountBalanceWallet sx={{ fontSize: 18 }} />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Depósito Inicial
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(person.initialDeposit)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ 
                    borderRadius: 2, 
                    bgcolor: balanceColor,
                    color: 'white',
                    width: 160
                  }}>
                    <CardContent sx={{ py: 1.5, px: 2, minHeight: 102, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                        <AccountBalanceWallet sx={{ fontSize: 18 }} />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Saldo Atual
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={700}>
                        {formatCurrency(person.balance)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ 
                    borderRadius: 2, 
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    width: 160
                  }}>
                    <CardContent sx={{ py: 1.5, px: 2, minHeight: 102, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                        <ShoppingCart sx={{ fontSize: 18 }} />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Total Gasto
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(person.purchases.reduce((sum, p) => sum + p.total, 0))}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, p: 3, overflowY: 'auto', borderRight: 1, borderColor: 'divider' }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Digite código ou 2*código para quantidade (Enter para adicionar)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
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
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Box>

              {filteredProducts.length === 0 && (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm 
                      ? 'Nenhum produto disponível com estoque para esta busca'
                      : 'Nenhum produto disponível com estoque no momento'}
                  </Typography>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      bgcolor: 'rgba(131, 71, 129, 0.08)',
                      border: '1px solid',
                      borderColor: 'rgba(131, 71, 129, 0.22)'
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Oferta Missionária
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={missionaryOfferAmount}
                          onChange={(e) => setMissionaryOfferAmount(e.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addMissionaryOfferToCart();
                            }
                          }}
                          placeholder="0,00"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                R$
                              </InputAdornment>
                            ),
                          }}
                        />
                        <Button
                          variant="contained"
                          onClick={addMissionaryOfferToCart}
                          sx={{ borderRadius: 2, minWidth: 108, bgcolor: 'tertiary.main', '&:hover': { bgcolor: 'tertiary.dark' } }}
                        >
                          Adicionar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {filteredProducts.map((product) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={product.id}>
                    <Card
                      onClick={() => addToCart(product.id)}
                      sx={{
                        borderRadius: 2,
                        cursor: 'pointer',
                        bgcolor: 'rgba(25, 118, 210, 0.04)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(25, 118, 210, 0.10)',
                          boxShadow: 3
                        }
                      }}
                    >
                      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={500}>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(product.price)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Estoque: {product.stock} | {product.barcode && `Código: ${product.barcode}`}
                          </Typography>
                        </Box>
                        <IconButton
                          color="primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product.id);
                          }}
                          disabled={product.stock === 0}
                          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                        >
                          <Add />
                        </IconButton>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Box>

          <Box sx={{ width: 400, p: 3, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShoppingCart />
              Carrinho
            </Typography>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {cartItems.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                  Carrinho vazio
                </Typography>
              ) : (
                <List>
                  {cartItems.map((item, index) => (
                    <ListItem
                      key={`${item.productId}-${index}`}
                      disableGutters
                      sx={{
                        py: 1,
                        px: 1,
                        bgcolor: index % 2 === 0 ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                        borderRadius: 1
                      }}
                    >
                      <ListItemText
                        primary={item.productName}
                        secondary={item.productId === MISSIONARY_OFFER_ITEM_ID ? undefined : `${formatCurrency(item.price)} x ${item.quantity} = ${formatCurrency(item.total)}`}
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {item.productId !== MISSIONARY_OFFER_ITEM_ID ? (
                            <>
                              <IconButton 
                                size="small" 
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                sx={{ bgcolor: 'action.hover' }}
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography sx={{ minWidth: 20, textAlign: 'center' }}>
                                {item.quantity}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                sx={{ bgcolor: 'action.hover' }}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <Typography sx={{ minWidth: 72, textAlign: 'right', pr: 1, fontWeight: 600 }}>
                              {formatCurrency(item.total)}
                            </Typography>
                          )}
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => updateQuantity(item.productId, 0)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(getTotalAmount())}
                </Typography>
              </Box>

              {getTotalAmount() > person.balance + 0.001 && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  Saldo insuficiente!
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handlePurchase}
                disabled={cartItems.length === 0 || getTotalAmount() > person.balance + 0.001}
                startIcon={<ShoppingCart />}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                Finalizar Compra
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

    </>
  );
};

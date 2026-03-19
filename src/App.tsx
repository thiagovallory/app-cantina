import { lazy, Suspense, useDeferredValue, useMemo, useState, startTransition } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  ToggleButtonGroup,
  ToggleButton,
  Fab,
  Button,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Paper,
  Chip
} from '@mui/material';
import { 
  People as PeopleIcon, 
  Inventory as InventoryIcon, 
  Add as AddIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  QrCodeScanner as QrCodeScannerIcon,
  MoreVert as MoreVertIcon,
  Assessment as AssessmentIcon,
  FileUpload as FileUploadIcon,
  ExitToApp as ExitToAppIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  VolunteerActivism as VolunteerActivismIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { AppProvider, useApp } from './context/AppContext';
import { PersonList } from './components/PersonList';
import { PersonDetail } from './components/PersonDetail';
import { ProductList } from './components/ProductList';
import { NetworkStatus } from './components/NetworkStatus';
import { BarcodeScanner } from './components/BarcodeScanner';
import type { Person } from './types/index';
import { createAppTheme } from './theme/theme';

const PersonForm = lazy(() => import('./components/PersonForm').then((module) => ({ default: module.PersonForm })));
const ProductForm = lazy(() => import('./components/ProductForm').then((module) => ({ default: module.ProductForm })));
const PurchaseModal = lazy(() => import('./components/PurchaseModal').then((module) => ({ default: module.PurchaseModal })));
const CSVImport = lazy(() => import('./components/CSVImport').then((module) => ({ default: module.CSVImport })));
const Reports = lazy(() => import('./components/Reports').then((module) => ({ default: module.Reports })));
const EncerrarAcampamento = lazy(() => import('./components/EncerrarAcampamento').then((module) => ({ default: module.EncerrarAcampamento })));
const BrandingSettings = lazy(() => import('./components/BrandingSettings').then((module) => ({ default: module.BrandingSettings })));
const DataSync = lazy(() => import('./components/DataSync').then((module) => ({ default: module.DataSync })));
const HelpGuide = lazy(() => import('./components/HelpGuide').then((module) => ({ default: module.HelpGuide })));

function ModalFallback() {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(12, 18, 24, 0.28)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 2.5,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <CircularProgress size={24} />
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Carregando
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preparando a proxima tela.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'people' | 'products'>('people');
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [purchasePerson, setPurchasePerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showEncerrarAcampamento, setShowEncerrarAcampamento] = useState(false);
  const [showBrandingSettings, setShowBrandingSettings] = useState(false);
  const [showDataSync, setShowDataSync] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showPeopleScanner, setShowPeopleScanner] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const { people, branding } = useApp();
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const appSummary = useMemo(() => {
    const brandingMissionaryOffersResetTime = branding.missionaryOffersResetAt
      ? new Date(branding.missionaryOffersResetAt).getTime()
      : 0;
    const latestCampClosingTime = people.reduce((latestTime, person) => (
      person.purchases.reduce((personLatestTime, purchase) => {
        const hasCampClosingItem = purchase.items.some((item) => item.productId === 'encerramento');
        if (!hasCampClosingItem) {
          return personLatestTime;
        }

        return Math.max(personLatestTime, new Date(purchase.date).getTime());
      }, latestTime)
    ), 0);
    const missionaryOffersResetTime = Math.max(
      brandingMissionaryOffersResetTime,
      latestCampClosingTime
    );
    const totalMissionaryOffers = people.reduce((total, person) => (
      total + person.purchases.reduce((personTotal, purchase) => (
        new Date(purchase.date).getTime() <= missionaryOffersResetTime
          ? personTotal
          : personTotal + purchase.items.reduce((itemsTotal, item) => (
              itemsTotal + (item.productName === 'Oferta Missionária' ? item.total : 0)
            ), 0)
      ), 0)
    ), 0);
    const filteredPeople = people.filter((person) => {
      const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
      if (!normalizedSearch) {
        return true;
      }

      return person.name.toLowerCase().includes(normalizedSearch) ||
        (person.customId && person.customId.toLowerCase().includes(normalizedSearch));
    });

    return {
      totalMissionaryOffers,
      filteredPeople,
      peopleCount: people.length
    };
  }, [branding.missionaryOffersResetAt, deferredSearchTerm, people]);
  const totalMissionaryOffers = appSummary.totalMissionaryOffers;
  const missionaryGoal = branding.missionaryGoal || 0;
  const missionaryProgress = missionaryGoal > 0 ? (totalMissionaryOffers / missionaryGoal) * 100 : 0;
  const missionaryProgressFill = Math.min(missionaryProgress, 100);
  const getMissionaryProgressColor = (progress: number) => {
    if (progress >= 100) return 'linear-gradient(90deg, #0b8f55 0%, #0fb36d 18%, #24c77f 36%, #5cd39d 54%, #8ce0ba 72%, #b7edd4 100%)';
    if (progress >= 85) return 'linear-gradient(90deg, #198754 0%, #2aa867 20%, #47bf79 40%, #79d49a 62%, #a7e5ba 82%, #d4f2dc 100%)';
    if (progress >= 70) return 'linear-gradient(90deg, #3f9b4f 0%, #5ab85a 20%, #84c95b 42%, #b1d85e 64%, #d5e88a 84%, #eef5c3 100%)';
    if (progress >= 55) return 'linear-gradient(90deg, #b38a12 0%, #c8a11b 18%, #dbba2c 38%, #e9cd4f 58%, #f2df7a 78%, #f8efb6 100%)';
    if (progress >= 40) return 'linear-gradient(90deg, #c27a15 0%, #d48d1d 20%, #e3a034 40%, #edb85e 60%, #f5cd8c 80%, #fae6c1 100%)';
    if (progress >= 25) return 'linear-gradient(90deg, #c25d1a 0%, #d86e24 22%, #e7843d 44%, #f09f67 66%, #f6be97 84%, #fbe0cb 100%)';
    if (progress >= 10) return 'linear-gradient(90deg, #bc3f23 0%, #d25535 20%, #e56f52 42%, #ef8d76 64%, #f5b0a1 84%, #fbd7d0 100%)';
    return 'linear-gradient(90deg, #a92e2e 0%, #c03d3d 18%, #d85858 40%, #e67c7c 62%, #f0a5a5 82%, #f7d3d3 100%)';
  };
  const missionaryProgressColor = getMissionaryProgressColor(missionaryProgress);

  const findPersonByIdentifier = (value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) {
      return undefined;
    }

    return people.find((person) => (
      person.customId?.trim().toLowerCase() === normalizedValue ||
      person.name.trim().toLowerCase() === normalizedValue
    ));
  };

  const openPersonFromLookup = (rawValue: string) => {
    const normalizedValue = rawValue.trim();
    if (!normalizedValue) {
      return;
    }

    setSearchTerm(normalizedValue);
    const matchedPerson = findPersonByIdentifier(normalizedValue);

    if (matchedPerson) {
      setSelectedPerson(null);
      setPurchasePerson(matchedPerson);
    }
  };

  const handlePeopleTabClick = () => {
    startTransition(() => {
      setActiveTab('people');
      setSelectedPerson(null);
      setSearchTerm('');
    });
  };

  const handleTabChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: 'people' | 'products' | null,
  ) => {
      if (newValue !== null) {
        // Se clicar em "Pessoas" e já está na aba pessoas, volta para a lista
        if (newValue === 'people' && activeTab === 'people' && selectedPerson) {
          startTransition(() => {
            setSelectedPerson(null);
            setSearchTerm('');
          });
      } else {
          startTransition(() => {
            setActiveTab(newValue);
            setSearchTerm('');
            setSelectedPerson(null);
          });
        }
      }
  };
  const filteredPeople = appSummary.filteredPeople;

  // Handler para Enter no campo de busca
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredPeople.length === 1) {
      // Se há exatamente uma pessoa encontrada, abre a tela de compra
      setPurchasePerson(filteredPeople[0]);
      return;
    }

    if (e.key === 'Enter' && searchTerm.trim()) {
      const matchedPerson = findPersonByIdentifier(searchTerm);
      if (matchedPerson) {
        setPurchasePerson(matchedPerson);
      }
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const openLazyPanel = (openState: React.Dispatch<React.SetStateAction<boolean>>) => {
    startTransition(() => {
      openState(true);
    });
    handleMenuClose();
  };

  const handleImportCSV = () => {
    openLazyPanel(setShowCSVImport);
  };

  const handleReports = () => {
    openLazyPanel(setShowReports);
  };

  const handleEncerrarAcampamento = () => {
    openLazyPanel(setShowEncerrarAcampamento);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: 'radial-gradient(circle at top left, rgba(0, 100, 149, 0.12), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.12), transparent 18%)'
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={(theme) => ({
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(12, 18, 28, 0.86)'
            : 'rgba(248, 251, 255, 0.84)',
          color: 'text.primary',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.08)'
            : 'divider'
        })}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            {branding.showLogo && (
              <img 
                src={branding.logoUrl} 
                alt="Logo da Organização" 
                style={{ 
                  height: '40px',
                  width: 'auto',
                  objectFit: 'contain'
                }} 
              />
            )}
            <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
              {branding.organizationName}
            </Typography>
            <Chip
              label={`${appSummary.peopleCount} pessoas`}
              size="small"
              sx={(theme) => ({
                borderRadius: 999,
                bgcolor: theme.palette.mode === 'dark'
                  ? 'rgba(76, 172, 214, 0.18)'
                  : 'rgba(0, 100, 149, 0.08)',
                color: theme.palette.mode === 'dark'
                  ? 'primary.light'
                  : 'primary.dark',
                fontWeight: 700
              })}
            />
            <Box sx={{ ml: 2 }}>
              <NetworkStatus />
            </Box>
          </Box>

          <ToggleButtonGroup
            value={activeTab}
            exclusive
            onChange={handleTabChange}
            aria-label="navigation tabs"
            sx={{
              mr: 2,
              '& .MuiToggleButton-root': {
                borderRadius: 4,
                border: 'none',
                mx: 0.5,
                px: 2,
                py: 1,
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="people" aria-label="pessoas" onClick={handlePeopleTabClick}>
              <PeopleIcon sx={{ mr: 1, fontSize: 20 }} />
              Pessoas
            </ToggleButton>
            <ToggleButton value="products" aria-label="produtos">
              <InventoryIcon sx={{ mr: 1, fontSize: 20 }} />
              Produtos
            </ToggleButton>
          </ToggleButtonGroup>

          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            aria-label="mais opções"
          >
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: (theme) => ({
                  mt: 1,
                  minWidth: 240,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'divider',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 16px 40px rgba(0,0,0,0.45)'
                    : '0 16px 40px rgba(15,23,42,0.12)',
                  '& .MuiMenuItem-root:hover': {
                    bgcolor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(15,23,42,0.04)'
                  }
                })
              }
            }}
          >
            <MenuItem onClick={handleImportCSV}>
              <ListItemIcon>
                <FileUploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Importar CSV</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleReports}>
              <ListItemIcon>
                <AssessmentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Relatórios</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => openLazyPanel(setShowBrandingSettings)}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Configurações</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => openLazyPanel(setShowDataSync)}>
              <ListItemIcon>
                <SyncIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sincronização</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => openLazyPanel(setShowHelpGuide)}>
              <ListItemIcon>
                <HelpOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Central de Ajuda</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={handleEncerrarAcampamento}
              sx={(theme) => ({ 
                color: 'warning.main',
                '&:hover': { 
                  bgcolor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 183, 77, 0.12)'
                    : 'warning.50' 
                }
              })}
            >
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" sx={{ color: 'warning.main' }} />
              </ListItemIcon>
              <ListItemText>Encerrar Acampamento</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
        <Box
          sx={(theme) => ({
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            bgcolor: theme.palette.mode === 'dark' ? '#14202b' : '#f0f0f0',
            borderTop: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(255,255,255,0.7)',
            borderBottom: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: theme.palette.mode === 'dark'
              ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
              : 'inset 0 1px 0 rgba(255,255,255,0.6)'
          })}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              width: `${missionaryProgressFill}%`,
              background: missionaryProgressColor,
              opacity: 0.96,
              transition: 'width 0.35s ease, background-color 0.35s ease'
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 32%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none'
            }}
          />
          <Box
            sx={(theme) => ({
              position: 'relative',
              zIndex: 1,
              px: { xs: 2, md: 3 },
              py: 0.45,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: theme.palette.mode === 'dark' ? 'grey.100' : 'common.black',
              flexWrap: 'wrap',
              textAlign: 'center'
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <VolunteerActivismIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Ofertas Missionária
              </Typography>
            </Box>
            <Box
              sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.25,
                borderRadius: 999,
                bgcolor: theme.palette.mode === 'dark'
                  ? 'rgba(10,16,24,0.42)'
                  : 'rgba(255,255,255,0.52)',
                backdropFilter: 'blur(4px)',
                border: theme.palette.mode === 'dark'
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(0,0,0,0.08)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 1px 2px rgba(0,0,0,0.28)'
                  : '0 1px 2px rgba(0,0,0,0.08)',
                flexShrink: 0
              })}
            >
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMissionaryOffers)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.78 }}>
                /
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {missionaryGoal > 0
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(missionaryGoal)
                  : 'Sem meta'}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                flexShrink: 0,
                px: 1.25,
                py: 0.25,
                borderRadius: 999,
                bgcolor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(10,16,24,0.58)'
                  : 'rgba(255,255,255,0.7)',
                border: (theme) => theme.palette.mode === 'dark'
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(0,0,0,0.08)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 1px 2px rgba(0,0,0,0.28)'
                  : '0 1px 2px rgba(0,0,0,0.08)'
              }}
            >
              {missionaryGoal > 0 ? `${Math.round(missionaryProgress)}%` : '--'}
            </Typography>
          </Box>
        </Box>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3, flexGrow: 1 }}>
        {selectedPerson ? (
          <PersonDetail person={selectedPerson} onBack={() => setSelectedPerson(null)} />
        ) : activeTab === 'people' ? (
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="Buscar pessoa por nome, ID, código ou QR... (Enter para abrir compra)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPeopleScanner(true)}
                        edge="end"
                        aria-label="abrir scanner para buscar pessoa"
                      >
                        <QrCodeScannerIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: '1 1 420px',
                  minWidth: 280,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowPersonForm(true)}
                sx={{ borderRadius: 3, minWidth: 190, height: 56 }}
              >
                Cadastrar Pessoa
              </Button>
            </Box>

            <PersonList 
              people={filteredPeople}
              onSelectPerson={(person) => {
                const event = window.event as MouseEvent;
                if (event && (event.ctrlKey || event.metaKey)) {
                  setSelectedPerson(person);
                } else {
                  setPurchasePerson(person);
                }
              }}
            />
            
            {searchTerm && filteredPeople.length === 0 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: 200,
                bgcolor: 'background.paper',
                borderRadius: 2,
                p: 3
              }}>
                <Typography variant="body1" color="text.secondary">
                  Nenhuma pessoa encontrada com o nome "{searchTerm}"
                </Typography>
              </Box>
            )}
          </Stack>
        ) : (
          <ProductList
            headerAction={(
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowProductForm(true)}
                sx={{ borderRadius: 3, minWidth: 190, height: 40 }}
              >
                Cadastrar Produto
              </Button>
            )}
          />
        )}
      </Container>

      {selectedPerson && (
        <Fab
          color="primary"
          aria-label="nova compra"
          onClick={() => setPurchasePerson(selectedPerson)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            borderRadius: 4,
          }}
        >
          <ShoppingCartIcon />
        </Fab>
      )}

      <Suspense fallback={<ModalFallback />}>
        {showPersonForm && <PersonForm onClose={() => setShowPersonForm(false)} />}
        {showProductForm && <ProductForm onClose={() => setShowProductForm(false)} />}
        {showPeopleScanner && (
          <BarcodeScanner
            onScan={(value) => {
              openPersonFromLookup(value);
              setShowPeopleScanner(false);
            }}
            onClose={() => setShowPeopleScanner(false)}
          />
        )}
        {purchasePerson && (
          <PurchaseModal
            person={purchasePerson}
            onClose={() => setPurchasePerson(null)}
          />
        )}
        {showCSVImport && (
          <CSVImport
            open={showCSVImport}
            onClose={() => setShowCSVImport(false)}
            type="auto"
          />
        )}
        {showReports && (
          <Reports
            open={showReports}
            onClose={() => setShowReports(false)}
          />
        )}
        {showEncerrarAcampamento && (
          <EncerrarAcampamento
            open={showEncerrarAcampamento}
            onClose={() => setShowEncerrarAcampamento(false)}
          />
        )}
        {showBrandingSettings && (
          <BrandingSettings
            open={showBrandingSettings}
            onClose={() => setShowBrandingSettings(false)}
          />
        )}
        {showDataSync && (
          <DataSync
            open={showDataSync}
            onClose={() => setShowDataSync(false)}
          />
        )}
        {showHelpGuide && (
          <HelpGuide
            open={showHelpGuide}
            onClose={() => setShowHelpGuide(false)}
          />
        )}
      </Suspense>
    </Box>
  );
}

function ThemedApp() {
  const { branding } = useApp();
  const theme = useMemo(() => createAppTheme(branding.darkMode), [branding.darkMode]);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}

function App() {
  return (
    <AppProvider>
      <ThemedApp />
    </AppProvider>
  );
}

export default App;

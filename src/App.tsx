import { useState } from 'react';
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
  ListItemText
} from '@mui/material';
import { 
  People as PeopleIcon, 
  Inventory as InventoryIcon, 
  Add as AddIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  MoreVert as MoreVertIcon,
  Assessment as AssessmentIcon,
  Upload as UploadIcon,
  FileUpload as FileUploadIcon,
  ExitToApp as ExitToAppIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  VolunteerActivism as VolunteerActivismIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { AppProvider, useApp } from './context/AppContext';
import { PersonList } from './components/PersonList';
import { PersonForm } from './components/PersonForm';
import { ProductForm } from './components/ProductForm';
import { PersonDetail } from './components/PersonDetail';
import { PurchaseModal } from './components/PurchaseModal';
import { ProductList } from './components/ProductList';
import { CSVImport } from './components/CSVImport';
import { Reports } from './components/Reports';
import { EncerrarAcampamento } from './components/EncerrarAcampamento';
import { BrandingSettings } from './components/BrandingSettings';
import { DataSync } from './components/DataSync';
import { NetworkStatus } from './components/NetworkStatus';
import { HelpGuide } from './components/HelpGuide';
import type { Person } from './types/index';
import { createAppTheme } from './theme/theme';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'people' | 'products'>('people');
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [purchasePerson, setPurchasePerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvImportType, setCSVImportType] = useState<'products' | 'people'>('products');
  const [showReports, setShowReports] = useState(false);
  const [showEncerrarAcampamento, setShowEncerrarAcampamento] = useState(false);
  const [showBrandingSettings, setShowBrandingSettings] = useState(false);
  const [showDataSync, setShowDataSync] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const { people, branding } = useApp();
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
  const missionaryGoal = branding.missionaryGoal || 0;
  const missionaryProgress = missionaryGoal > 0 ? Math.min((totalMissionaryOffers / missionaryGoal) * 100, 100) : 0;
  const getMissionaryProgressColor = (progress: number) => {
    if (progress >= 100) return '#00c853';
    if (progress >= 75) return '#43a047';
    if (progress >= 50) return '#ffd600';
    if (progress >= 25) return '#ff8f00';
    return '#f44336';
  };
  const missionaryProgressColor = getMissionaryProgressColor(missionaryProgress);

  const handleTabChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: 'people' | 'products' | null,
  ) => {
    if (newValue !== null) {
      // Se clicar em "Pessoas" e já está na aba pessoas, volta para a lista
      if (newValue === 'people' && activeTab === 'people' && selectedPerson) {
        setSelectedPerson(null);
        setSearchTerm('');
      } else {
        setActiveTab(newValue);
        setSearchTerm(''); // Limpa a busca ao mudar de aba
        setSelectedPerson(null); // Limpa a pessoa selecionada ao mudar de aba
      }
    }
  };

  // Filtra pessoas baseado no termo de busca (nome ou ID customizado)
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.customId && person.customId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handler para Enter no campo de busca
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredPeople.length === 1) {
      // Se há exatamente uma pessoa encontrada, abre a tela de compra
      setPurchasePerson(filteredPeople[0]);
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleImportCSV = (type: 'products' | 'people') => {
    setCSVImportType(type);
    setShowCSVImport(true);
    handleMenuClose();
  };

  const handleReports = () => {
    setShowReports(true);
    handleMenuClose();
  };

  const handleEncerrarAcampamento = () => {
    setShowEncerrarAcampamento(true);
    handleMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'surface.variant', color: 'text.primary' }}>
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
            <Box sx={{ ml: 2 }}>
              <NetworkStatus />
            </Box>
          </Box>
          
          <Box
            sx={{
              mr: 2,
              px: 1.75,
              py: 0.9,
              borderRadius: 4,
              color: 'common.white',
              minWidth: 248,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              position: 'relative',
              overflow: 'hidden',
              bgcolor: '#7a7f87',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.12)'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                width: `${missionaryProgress}%`,
                bgcolor: missionaryProgressColor,
                transition: 'width 0.35s ease, background-color 0.35s ease'
              }}
            />
            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
              <VolunteerActivismIcon sx={{ fontSize: 20, color: 'common.white', flexShrink: 0 }} />
              <Box sx={{ textAlign: 'left', lineHeight: 1.1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', color: 'common.white', opacity: 0.92 }}>
                  Ofertas Missionaria
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'common.white', whiteSpace: 'nowrap' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMissionaryOffers)} / {missionaryGoal > 0
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(missionaryGoal)
                    : 'Sem meta'}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                pl: 1.5,
                ml: 0.5,
                borderLeft: '1px solid rgba(255,255,255,0.35)'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'common.white', lineHeight: 1 }}>
                {missionaryGoal > 0 ? `${Math.round(missionaryProgress)}%` : '--'}
              </Typography>
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
            <ToggleButton value="people" aria-label="pessoas">
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
          >
            <MenuItem onClick={() => handleImportCSV('products')}>
              <ListItemIcon>
                <FileUploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Importar Produtos CSV</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleImportCSV('people')}>
              <ListItemIcon>
                <UploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Importar Pessoas CSV</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleReports}>
              <ListItemIcon>
                <AssessmentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Relatórios</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setShowBrandingSettings(true); setMenuAnchorEl(null); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Configurações</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setShowDataSync(true); setMenuAnchorEl(null); }}>
              <ListItemIcon>
                <SyncIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sincronização</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setShowHelpGuide(true); setMenuAnchorEl(null); }}>
              <ListItemIcon>
                <HelpOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Central de Ajuda</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={handleEncerrarAcampamento}
              sx={{ 
                color: 'warning.main',
                '&:hover': { 
                  bgcolor: 'warning.50' 
                }
              }}
            >
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" sx={{ color: 'warning.main' }} />
              </ListItemIcon>
              <ListItemText>Encerrar Acampamento</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3, flexGrow: 1 }}>
        {selectedPerson ? (
          <PersonDetail person={selectedPerson} onBack={() => setSelectedPerson(null)} />
        ) : activeTab === 'people' ? (
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="Buscar pessoa por nome ou ID... (Enter para abrir compra)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
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

      {showPersonForm && <PersonForm onClose={() => setShowPersonForm(false)} />}
      {showProductForm && <ProductForm onClose={() => setShowProductForm(false)} />}
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
          type={csvImportType}
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
    </Box>
  );
}

function ThemedApp() {
  const { branding } = useApp();
  const theme = createAppTheme(branding.darkMode);
  
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

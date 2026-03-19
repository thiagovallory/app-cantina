import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  HelpOutline as HelpOutlineIcon,
  Keyboard as KeyboardIcon,
  People as PeopleIcon,
  Inventory2 as Inventory2Icon,
  ShoppingCart as ShoppingCartIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface HelpGuideProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: 'Visão Geral',
    icon: <HelpOutlineIcon color="primary" />,
    items: [
      'Cadastre pessoas com depósito inicial e acompanhe saldo, compras e ofertas missionárias.',
      'Cadastre produtos com código de barras, quantidade comprada, custo total e preço de venda.',
      'Use relatórios, importação, exportação e encerramento para fechar um acampamento e preparar o próximo.'
    ]
  },
  {
    title: 'Pessoas',
    icon: <PeopleIcon color="primary" />,
    items: [
      'Clique em uma pessoa para abrir Nova compra.',
      'Ctrl+clique ou Cmd+clique em uma pessoa para abrir os detalhes da conta.',
      'Na busca de pessoas, se houver apenas um resultado, pressione Enter para abrir a compra dessa pessoa.',
      'Nos detalhes da pessoa, você pode editar nome, foto, ID e depósito inicial.',
      'Também é possível ajustar a quantidade de itens comprados, excluir itens, excluir compras inteiras e remover a pessoa do sistema.'
    ]
  },
  {
    title: 'Nova Compra',
    icon: <ShoppingCartIcon color="primary" />,
    items: [
      'Digite o código de barras e pressione Enter para adicionar o produto ao carrinho.',
      'Use o formato 2*CODIGO para adicionar várias unidades de uma vez.',
      'Clique no ícone de scanner no campo de busca para ler o código pela câmera.',
      'No card Oferta Missionária, digite o valor e pressione Enter para adicionar ao carrinho.',
      'Use Ctrl+Enter ou Cmd+Enter para finalizar a compra.'
    ]
  },
  {
    title: 'Produtos',
    icon: <Inventory2Icon color="primary" />,
    items: [
      'Cadastre produtos com nome, código de barras, custo total, quantidade comprada e preço.',
      'A quantidade comprada define o estoque inicial do produto.',
      'Na lista de produtos, use a busca por nome ou código e o scanner no lado direito do campo.',
      'O valor unitário é calculado automaticamente a partir de Custo / Qtd Comprada.'
    ]
  },
  {
    title: 'Relatórios e Encerramento',
    icon: <AssessmentIcon color="primary" />,
    items: [
      'No menu, gere relatórios de pessoas, histórico e resumo de vendas em CSV ou PDF.',
      'No encerramento, o sistema gera um pacote com os relatórios finais atualizados.',
      'No fechamento do acampamento, você escolhe o destino dos saldos positivos e o sistema prepara o próximo ciclo.'
    ]
  },
  {
    title: 'Configuração e Dados',
    icon: <SettingsIcon color="primary" />,
    items: [
      'Em Configurações, altere nome, logo, exibição da logo e meta de oferta missionária.',
      'Em Sincronização, exporte e importe o backup completo do sistema.',
      'A importação CSV aceita pessoas e produtos, e o backup JSON preserva histórico e configurações.'
    ]
  },
  {
    title: 'Importação CSV',
    icon: <SettingsIcon color="primary" />,
    items: [
      'Use o menu Importar CSV para carregar pessoas ou produtos com um único botão.',
      'O sistema analisa os cabeçalhos do arquivo e confirma antes de importar para evitar erro de tipo.',
      'Para produtos, o formato recomendado é: Código, Produto, Qtd Comprada, Custo, Preço.',
      'Para pessoas, o formato recomendado é: ID Personalizado, Nome, Depósito Inicial.',
      'Quando o estoque não vier no CSV de produtos, ele será assumido como igual à quantidade comprada.'
    ]
  }
];

const shortcuts = [
  'Ctrl+Clique / Cmd+Clique: abrir detalhes da pessoa',
  'Enter na busca de pessoas: abrir compra quando houver 1 resultado',
  'Enter no código do produto: adicionar ao carrinho',
  '2*CODIGO + Enter: adicionar várias unidades',
  'Enter em Oferta Missionária: adicionar oferta ao carrinho',
  'Ctrl+Enter / Cmd+Enter: finalizar compra'
];

export const HelpGuide: React.FC<HelpGuideProps> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HelpOutlineIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Central de Ajuda
        </Typography>
      </Box>
      <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />}>
        Fechar
      </Button>
    </DialogTitle>

    <DialogContent dividers>
      <Stack spacing={3}>
        <Card sx={{ borderRadius: 2, bgcolor: 'rgba(0, 100, 149, 0.06)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <KeyboardIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Atalhos Rápidos
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {shortcuts.map((shortcut) => (
                <Chip
                  key={shortcut}
                  label={shortcut}
                  sx={{ borderRadius: 2, height: 'auto', '& .MuiChip-label': { py: 0.75 } }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2
          }}
        >
          {sections.map((section) => (
            <Card key={section.title} sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  {section.icon}
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {section.title}
                  </Typography>
                </Box>
                <Stack spacing={1.25}>
                  {section.items.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    </DialogContent>

    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button onClick={onClose} variant="contained">
        Entendi
      </Button>
    </DialogActions>
  </Dialog>
);

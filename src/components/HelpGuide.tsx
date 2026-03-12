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
    title: 'Visao Geral',
    icon: <HelpOutlineIcon color="primary" />,
    items: [
      'Cadastre pessoas com deposito inicial e acompanhe saldo, compras e ofertas missionarias.',
      'Cadastre produtos com codigo de barras, quantidade comprada, custo total e preco de venda.',
      'Use relatorios, importacao, exportacao e encerramento para fechar um acampamento e preparar o proximo.'
    ]
  },
  {
    title: 'Pessoas',
    icon: <PeopleIcon color="primary" />,
    items: [
      'Clique em uma pessoa para abrir Nova compra.',
      'Ctrl+clique ou Cmd+clique em uma pessoa para abrir os detalhes da conta.',
      'Na busca de pessoas, se houver apenas um resultado, pressione Enter para abrir a compra dessa pessoa.'
    ]
  },
  {
    title: 'Nova Compra',
    icon: <ShoppingCartIcon color="primary" />,
    items: [
      'Digite o codigo de barras e pressione Enter para adicionar o produto ao carrinho.',
      'Use o formato 2*CODIGO para adicionar varias unidades de uma vez.',
      'Clique no icone de scanner no campo de busca para ler o codigo pela camera.',
      'No card Oferta Missionaria, digite o valor e pressione Enter para adicionar ao carrinho.',
      'Use Ctrl+Enter ou Cmd+Enter para finalizar a compra.'
    ]
  },
  {
    title: 'Produtos',
    icon: <Inventory2Icon color="primary" />,
    items: [
      'Cadastre produtos com nome, codigo de barras, custo total, quantidade comprada e preco.',
      'A quantidade comprada define o estoque inicial do produto.',
      'Na lista de produtos, use a busca por nome ou codigo e o scanner no lado direito do campo.',
      'O valor unitario e calculado automaticamente a partir de Custo / Qtd Comprada.'
    ]
  },
  {
    title: 'Relatorios E Encerramento',
    icon: <AssessmentIcon color="primary" />,
    items: [
      'No menu, gere relatorios de pessoas, historico e resumo de vendas em CSV ou PDF.',
      'No encerramento, o sistema gera um pacote com os relatorios finais atualizados.',
      'No fechamento do acampamento, voce escolhe o destino dos saldos positivos e o sistema prepara o proximo ciclo.'
    ]
  },
  {
    title: 'Configuracao E Dados',
    icon: <SettingsIcon color="primary" />,
    items: [
      'Em Configuracoes, altere nome, logo, exibicao da logo e meta de oferta missionaria.',
      'Em Sincronizacao, exporte e importe o backup completo do sistema.',
      'A importacao CSV aceita pessoas e produtos, e o backup JSON preserva historico e configuracoes.'
    ]
  }
];

const shortcuts = [
  'Ctrl+Clique / Cmd+Clique: abrir detalhes da pessoa',
  'Enter na busca de pessoas: abrir compra quando houver 1 resultado',
  'Enter no codigo do produto: adicionar ao carrinho',
  '2*CODIGO + Enter: adicionar varias unidades',
  'Enter em Oferta Missionaria: adicionar oferta ao carrinho',
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
        <Card sx={{ borderRadius: 3, bgcolor: 'rgba(0, 100, 149, 0.06)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <KeyboardIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Atalhos Rapidos
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
            <Card key={section.title} sx={{ borderRadius: 3, height: '100%' }}>
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

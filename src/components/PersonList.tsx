import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Typography,
  Box,
  Stack,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  AccountBalanceWallet,
  ChevronRight
} from '@mui/icons-material';
import type { Person } from '../types/index';

interface PersonListProps {
  people: Person[];
  onSelectPerson: (person: Person) => void;
}

export const PersonList: React.FC<PersonListProps> = ({ people, onSelectPerson }) => {
  const normalizeCurrency = (value: number) => Math.round(value * 100) / 100;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  // Ordena as pessoas alfabeticamente pelo nome
  const sortedPeople = [...people].sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );

  if (people.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 300,
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 3
      }}>
        <Typography variant="body1" color="text.secondary">
          Nenhuma pessoa cadastrada ainda
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {sortedPeople.map((person) => {
        const normalizedBalance = normalizeCurrency(person.balance);

        return (
        <Grid key={person.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card 
            sx={{ 
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }}
          >
            <CardActionArea onClick={(e) => {
              e.preventDefault();
              onSelectPerson(person);
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={person.photo}
                      sx={{ 
                        width: 48, 
                        height: 48,
                        bgcolor: person.photo ? 'transparent' : 'primary.light'
                      }}
                    >
                      {!person.photo && <PersonIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {person.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {person.customId && `ID: ${person.customId} • `}{person.purchases.length} compras
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRight color="action" />
                </Box>

                <Stack spacing={1.5}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'surface.variant'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceWallet fontSize="small" color="action" />
                      <Typography variant="body2" marginRight={1}>Saldo</Typography>
                    </Box>
                    <Chip
                      label={formatCurrency(normalizedBalance)}
                      color={
                        normalizedBalance <= 0
                          ? 'error'
                          : person.initialDeposit > 0 && normalizedBalance / person.initialDeposit <= 0.2
                            ? 'warning'
                            : 'success'
                      }
                      size="small"
                      sx={{ 
                        fontWeight: 600,
                        color: 'common.white'
                      }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        );
      })}
    </Grid>
  );
};

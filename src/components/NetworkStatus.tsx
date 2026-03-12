import React, { useState, useEffect } from 'react';
import {
  Chip,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  Wifi as WifiIcon
} from '@mui/icons-material';

export const NetworkStatus: React.FC = () => {
  const [networkInfo, setNetworkInfo] = useState<{
    isNetworkAccess: boolean;
    currentUrl: string;
  }>({
    isNetworkAccess: false,
    currentUrl: ''
  });

  useEffect(() => {
    const currentUrl = window.location.href;
    const isNetworkAccess = !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1');
    
    setNetworkInfo({
      isNetworkAccess,
      currentUrl
    });
  }, []);

  if (!networkInfo.isNetworkAccess) {
    return null; // Só mostra quando está em acesso de rede
  }

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">
            <strong>Acesso pela Rede Local</strong>
          </Typography>
          <Typography variant="caption">
            URL: {networkInfo.currentUrl}
          </Typography>
          <br />
          <Typography variant="caption">
            Use menu → Sincronização para compartilhar dados
          </Typography>
        </Box>
      }
    >
      <Chip
        icon={<WifiIcon />}
        label="Rede"
        color="success"
        variant="outlined"
        size="small"
        sx={{
          '& .MuiChip-icon': {
            fontSize: 16
          }
        }}
      />
    </Tooltip>
  );
};
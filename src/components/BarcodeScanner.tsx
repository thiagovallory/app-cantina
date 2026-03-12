import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, IconButton, Button } from '@mui/material';
import { Close, Cameraswitch } from '@mui/icons-material';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasScannedRef = useRef(false);
  const [availableDeviceIds, setAvailableDeviceIds] = useState<string[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        hasScannedRef.current = false;
        setError(null);
        controlsRef.current?.stop();
        BrowserMultiFormatReader.releaseAllStreams();

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E
        ]);

        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId
            ? {
                deviceId: { exact: selectedDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
        };

        controlsRef.current = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result) => {
            const scannedText = result?.getText()?.trim();
            if (!scannedText || hasScannedRef.current) return;

            hasScannedRef.current = true;
            controlsRef.current?.stop();
            BrowserMultiFormatReader.releaseAllStreams();
            onScan(scannedText);
          }
        );

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        setAvailableDeviceIds(devices.map((device) => device.deviceId));

        if (!selectedDeviceId && devices.length > 1) {
          const preferredDevice = devices.find((device) => /back|traseira|rear|environment/i.test(device.label));
          if (preferredDevice) {
            setSelectedDeviceId(preferredDevice.deviceId);
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar scanner:', err);
        setError('Nao foi possivel acessar a camera neste dispositivo ou navegador.');
      }
    };

    startScanner();

    return () => {
      controlsRef.current?.stop();
      BrowserMultiFormatReader.releaseAllStreams();
      if (videoRef.current) {
        BrowserMultiFormatReader.cleanVideoSource(videoRef.current);
      }
    };
  }, [onScan, selectedDeviceId]);

  const handleSwitchCamera = () => {
    if (availableDeviceIds.length < 2) return;

    const currentIndex = availableDeviceIds.findIndex((deviceId) => deviceId === selectedDeviceId);
    const nextDeviceId = availableDeviceIds[(currentIndex + 1) % availableDeviceIds.length];
    setSelectedDeviceId(nextDeviceId);
  };

  if (error) {
    return (
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <Paper sx={{ p: 3, m: 2, maxWidth: 420, textAlign: 'center', position: 'relative' }}>
          <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <Close />
          </IconButton>
          <Typography color="error" gutterBottom variant="h6">
            Erro no Scanner
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Certifique-se de que o navegador tem permissao para acessar a camera<br/>
            • Em celular, a camera no navegador normalmente exige HTTPS ou `localhost`<br/>
            • Verifique se a camera nao esta sendo usada por outro app
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      p: 2
    }}>
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.3)'
          }
        }}
      >
        <Close />
      </IconButton>

      {availableDeviceIds.length > 1 && (
        <Button
          onClick={handleSwitchCamera}
          startIcon={<Cameraswitch />}
          variant="contained"
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            borderRadius: 999,
            bgcolor: 'rgba(255, 255, 255, 0.18)',
            color: 'common.white',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.28)'
            }
          }}
        >
          Trocar camera
        </Button>
      )}

      <Box sx={{
        width: '100%',
        maxWidth: 640,
        height: 480,
        position: 'relative',
        border: '2px solid white',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'black'
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <Box sx={{
            width: 250,
            height: 150,
            border: '3px solid #ff4444',
            borderRadius: 1,
            position: 'relative',
            backgroundColor: 'transparent'
          }}>
            <Box sx={{
              position: 'absolute',
              top: -3,
              left: -3,
              width: 20,
              height: 20,
              borderTop: '6px solid #ff4444',
              borderLeft: '6px solid #ff4444'
            }} />
            <Box sx={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 20,
              height: 20,
              borderTop: '6px solid #ff4444',
              borderRight: '6px solid #ff4444'
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -3,
              left: -3,
              width: 20,
              height: 20,
              borderBottom: '6px solid #ff4444',
              borderLeft: '6px solid #ff4444'
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -3,
              right: -3,
              width: 20,
              height: 20,
              borderBottom: '6px solid #ff4444',
              borderRight: '6px solid #ff4444'
            }} />
          </Box>
        </Box>
      </Box>

      <Typography
        variant="h6"
        sx={{
          color: 'white',
          mt: 3,
          textAlign: 'center',
          textShadow: '0 0 10px rgba(0,0,0,0.8)'
        }}
      >
        Posicione o codigo de barras dentro do quadro vermelho
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255,255,255,0.8)',
          mt: 1,
          textAlign: 'center',
          textShadow: '0 0 10px rgba(0,0,0,0.8)'
        }}
      >
        Mantenha o codigo bem iluminado e centralizado
      </Typography>

      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.72)',
          mt: 2,
          textAlign: 'center'
        }}
      >
        Leitura otimizada para EAN, UPC, Code 128 e Code 39
      </Typography>
    </Box>
  );
};

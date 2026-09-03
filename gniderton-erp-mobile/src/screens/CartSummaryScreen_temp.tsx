import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle, MapPin, Phone } from 'lucide-react-native';
import { useAppStore, PendingOrder } from '../store';
import { useTheme } from '../theme';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/geo';
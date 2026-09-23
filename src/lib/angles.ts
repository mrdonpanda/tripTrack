export const ANGLES = [
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'driver_side', label: 'Driver side' },
  { id: 'back', label: 'Back' },
  { id: 'passenger_side', label: 'Passenger side' },
  { id: 'keys', label: 'Keys' },
  { id: 'under_vehicle', label: 'Under vehicle' },
] as const;

export type Angle = (typeof ANGLES)[number]['id'];

export const ANGLE_FILE_TAG: Record<Angle, string> = {
  top: 'top',
  front: 'front',
  driver_side: 'driver',
  back: 'back',
  passenger_side: 'passenger',
  keys: 'keys',
  under_vehicle: 'under',
};

export const MAX_CARS = 15;
export const DEFAULT_CAR_COUNT = 9;

export function angleLabel(angle: Angle): string {
  return ANGLES.find((item) => item.id === angle)?.label ?? angle;
}

export function photoKey(carId: string, angle: Angle): string {
  return `${carId}:${angle}`;
}

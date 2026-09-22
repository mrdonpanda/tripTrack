import { render, screen } from '@testing-library/react-native';

import { ShareTripView } from '../src/components/ShareTripView';
import type { SharedTrip } from '../src/lib/api';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { supabaseUrl: 'https://db.orale.boo' } } },
}));

describe('share page', () => {
  it('shows the city, date, lot numbers, and photos without pay or user id', async () => {
    const trip = {
      city_name: 'Pittsburgh',
      trip_date: '2026-09-22',
      pay_cents: 75000,
      user_id: 'secret-user-id',
      cars: [
        {
          position: 1,
          lot_number: 'A12',
          photos: [{ angle: 'top', storage_path: 'secret-user-id/trip/car/top.jpg' }],
        },
      ],
    } as SharedTrip & { pay_cents: number; user_id: string };

    await render(<ShareTripView trip={trip} />);

    expect(screen.getByText('Pittsburgh')).toBeTruthy();
    expect(screen.getByText('Lot A12')).toBeTruthy();
    expect(screen.getByText('Top')).toBeTruthy();
    expect(screen.getByLabelText('Top')).toBeTruthy();
    expect(screen.queryByText(/750/)).toBeNull();
    expect(screen.queryByText('secret-user-id')).toBeNull();
    expect(screen.queryByText(/Pay/)).toBeNull();
    expect(screen.queryByText(/user_id/)).toBeNull();
  });
});

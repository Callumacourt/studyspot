export type FiltersState = {
  temp: [number, number];
  humidity: [number, number];
  noise: string;
  occupancy: string;
  accessibility: string[];
};

export type RangeFilterProps = {
  label: string;
  reading: keyof FiltersState;
  vals: FiltersState;
  setVals: React.Dispatch<React.SetStateAction<FiltersState>>;
  min: number;
  max: number;
  step: number;
  unit: string;
};

export type RoomFilterProps = {
  onFilterChange: (filters: FiltersState) => void;
  onReset: () => void;
  filteredRooms?: { id: string; name: string }[];
};

import { createSlice } from '@reduxjs/toolkit';

interface UiState {
  isModalOpen: boolean;
}

const initialState: UiState = {
  isModalOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleModal(state) {
      state.isModalOpen = !state.isModalOpen;
    },
  },
});

export const { toggleModal } = uiSlice.actions;
export default uiSlice.reducer;
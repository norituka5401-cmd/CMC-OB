const IS_SERVER = typeof window === 'undefined';

// crypto.randomUUID が利用できない場合のフォールバック ID 生成
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const mockStorage = {
  getEvents: () => {
    if (IS_SERVER) return [];
    try {
      return JSON.parse(localStorage.getItem('mock_events') || '[]');
    } catch (e) {
      console.error("Failed to parse mock_events", e);
      return [];
    }
  },
  saveEvent: (event: any) => {
    const events = mockStorage.getEvents();
    const newEvent = { ...event, id: generateId(), created_at: new Date().toISOString() };
    localStorage.setItem('mock_events', JSON.stringify([...events, newEvent]));
    return newEvent;
  },
  getEvent: (id: string) => {
    return mockStorage.getEvents().find((e: any) => e.id === id);
  },
  saveOptions: (options: any[]) => {
    try {
      const allOptions = JSON.parse(localStorage.getItem('mock_options') || '[]');
      localStorage.setItem('mock_options', JSON.stringify([...allOptions, ...options]));
    } catch (e) {
      console.error("Failed to save mock_options", e);
    }
  },
  getOptions: (eventId: string) => {
    if (IS_SERVER) return [];
    try {
      const allOptions = JSON.parse(localStorage.getItem('mock_options') || '[]');
      return allOptions.filter((o: any) => o.event_id === eventId);
    } catch (e) {
      return [];
    }
  },
  saveResponse: (response: any, availability: any[]) => {
    try {
      const responses = JSON.parse(localStorage.getItem('mock_responses') || '[]');
      const newResponse = { ...response, id: generateId() };
      localStorage.setItem('mock_responses', JSON.stringify([...responses, newResponse]));

      const allAvail = JSON.parse(localStorage.getItem('mock_availability') || '[]');
      const newAvail = availability.map(a => ({ ...a, response_id: newResponse.id }));
      localStorage.setItem('mock_availability', JSON.stringify([...allAvail, ...newAvail]));
      return newResponse;
    } catch (e) {
      console.error("Failed to save response", e);
    }
  },
  getResponsesWithAvailability: (eventId: string) => {
    if (IS_SERVER) return [];
    try {
      const allResponses = JSON.parse(localStorage.getItem('mock_responses') || '[]');
      const allAvail = JSON.parse(localStorage.getItem('mock_availability') || '[]');
      
      return allResponses
        .filter((r: any) => r.event_id === eventId)
        .map((r: any) => ({
          ...r,
          availability: allAvail.filter((a: any) => a.response_id === r.id)
        }));
    } catch (e) {
      return [];
    }
  },
  updateEvent: (id: string, updates: any) => {
    const events = mockStorage.getEvents();
    const index = events.findIndex((e: any) => e.id === id);
    if (index === -1) return null;
    events[index] = { ...events[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('mock_events', JSON.stringify(events));
    return events[index];
  },
  deleteEvent: (id: string) => {
    const events = mockStorage.getEvents().filter((e: any) => e.id !== id);
    localStorage.setItem('mock_events', JSON.stringify(events));

    // 関連データの削除
    const allOptions = JSON.parse(localStorage.getItem('mock_options') || '[]');
    localStorage.setItem('mock_options', JSON.stringify(allOptions.filter((o: any) => o.event_id !== id)));
    
    const allResponses = JSON.parse(localStorage.getItem('mock_responses') || '[]');
    const eventResponses = allResponses.filter((r: any) => r.event_id === id);
    localStorage.setItem('mock_responses', JSON.stringify(allResponses.filter((r: any) => r.event_id !== id)));
    
    const allAvail = JSON.parse(localStorage.getItem('mock_availability') || '[]');
    const respIds = new Set(eventResponses.map((r: any) => r.id));
    localStorage.setItem('mock_availability', JSON.stringify(allAvail.filter((a: any) => !respIds.has(a.response_id))));
  },
  deleteResponse: (responseId: string) => {
    const allResponses = JSON.parse(localStorage.getItem('mock_responses') || '[]');
    localStorage.setItem('mock_responses', JSON.stringify(allResponses.filter((r: any) => r.id !== responseId)));
    
    const allAvail = JSON.parse(localStorage.getItem('mock_availability') || '[]');
    localStorage.setItem('mock_availability', JSON.stringify(allAvail.filter((a: any) => a.response_id !== responseId)));
  }
};

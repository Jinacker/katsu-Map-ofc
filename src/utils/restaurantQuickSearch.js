const normalize = (value) => String(value ?? '')
  .normalize('NFKC')
  .replace(/\s+/g, '')
  .toLocaleLowerCase('ko-KR');

export function searchRestaurants(restaurants, query) {
  const term = normalize(query);
  if (!term) return [];
  const idTerm = term.replace(/^#/, '');
  const id = /^\d+$/.test(idTerm) ? Number(idTerm) : null;

  return restaurants.filter((restaurant) => (
    (id !== null && restaurant.id === id)
    || [restaurant.name, restaurant.addr, restaurant.area].some((value) => normalize(value).includes(term))
  ));
}

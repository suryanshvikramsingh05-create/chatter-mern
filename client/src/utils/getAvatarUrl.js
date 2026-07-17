const getAvatarUrl = (pic) => {
  if (!pic) return null;
  return `${import.meta.env.VITE_API_URL}${pic}`;
};

export default getAvatarUrl;

export default () => ({
  port: parseInt(process.env.PORT ?? '3011', 10),
});

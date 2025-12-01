export default () => ({
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'collaboration-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: false,
    sasl: undefined,
  },
});

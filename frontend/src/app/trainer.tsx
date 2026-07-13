import { Redirect } from 'expo-router';

export default function TrainerRedirect() {
  return <Redirect href={{ pathname: '/coach', params: { tab: 'plans' } }} />;
}

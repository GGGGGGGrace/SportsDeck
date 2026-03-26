type UserPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">User Profile</h1>
      <p className="text-zinc-600 dark:text-zinc-300">Viewing user: {id}</p>
    </div>
  );
}
import { TrainingSessionsCard } from './TrainingSessionsCard';
import { CurriculaCard } from './CurriculaCard';
import { TechniquesCard } from './TechniquesCard';
import { SaveVideoCard } from './SaveVideoCard';

export function Dashboard() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Manage your BJJ training and knowledge</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CurriculaCard />
        <TechniquesCard />
        <SaveVideoCard />
      </div>
    </div>
  );
}

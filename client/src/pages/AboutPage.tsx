import { SectionCard } from "@/components/SectionCard";
import { BookOpen, Code2, Database } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col h-full p-4 gap-4 anim-in max-w-3xl">
      <h1 className="text-2xl font-serif font-semibold tracking-tight" data-testid="text-page-title">
        О проекте Flavor Atlas
      </h1>

      <SectionCard title="Что это такое?">
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-about-description">
          Flavor Atlas — инструмент для исследования вкусовых сочетаний ингредиентов на основе
          анализа ароматических соединений. Приложение визуализирует связи между продуктами,
          помогая шеф-поварам, фуд-инженерам и энтузиастам кулинарии находить неожиданные
          и гармоничные пары ингредиентов.
        </p>
      </SectionCard>

      <SectionCard title="Источники данных">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium" data-testid="text-source-flavor-bible">The Flavor Bible</p>
              <p className="text-xs text-muted-foreground">
                Карен Пейдж и Эндрю Дорненбург — энциклопедия вкусовых сочетаний
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium" data-testid="text-source-flavor-thesaurus">The Flavor Thesaurus</p>
              <p className="text-xs text-muted-foreground">
                Ники Сегнит — тезаурус вкусовых ассоциаций и классических пар
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium" data-testid="text-source-larousse">Larousse Gastronomique</p>
              <p className="text-xs text-muted-foreground">
                Фундаментальная кулинарная энциклопедия
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Технологии">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Code2 className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium" data-testid="text-tech-frontend">React + D3.js</p>
              <p className="text-xs text-muted-foreground">
                Интерактивный интерфейс и визуализация графа связей
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium" data-testid="text-tech-backend">PostgreSQL + Express</p>
              <p className="text-xs text-muted-foreground">
                Хранение данных об ингредиентах, соединениях и вкусовых парах
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

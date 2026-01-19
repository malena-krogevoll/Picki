import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Leaf, Heart, MapPin } from "lucide-react";
import { MatchInfo, UserPreferences } from "@/lib/preferenceAnalysis";

interface PreferenceIndicatorsProps {
  matchInfo: MatchInfo;
  userPreferences: UserPreferences | null;
  compact?: boolean;
}

export const PreferenceIndicators = ({ 
  matchInfo, 
  userPreferences,
  compact = false 
}: PreferenceIndicatorsProps) => {
  if (!userPreferences) return null;
  
  const hasAnyIndicators = 
    matchInfo.allergyWarnings.length > 0 ||
    matchInfo.dietWarnings.length > 0 ||
    matchInfo.dietMatches.length > 0 ||
    (userPreferences.other_preferences?.organic) ||
    (userPreferences.other_preferences?.animal_welfare && matchInfo.animalWelfareLevel !== 'unknown') ||
    (userPreferences.other_preferences?.local_food);

  if (!hasAnyIndicators) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : 'mt-2'}`}>
      {/* Allergen warnings - RED (dangerous) */}
      {matchInfo.allergyWarnings.map((warning) => (
        <Badge 
          key={`allergy-${warning}`}
          className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {warning}
        </Badge>
      ))}

      {/* Diet warnings - RED */}
      {matchInfo.dietWarnings.map((warning) => (
        <Badge 
          key={`diet-warning-${warning}`}
          className="bg-destructive/80 text-destructive-foreground text-xs px-2 py-0.5 rounded-full"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Ikke {warning}
        </Badge>
      ))}

      {/* Diet matches - GREEN */}
      {matchInfo.dietMatches.map((diet) => (
        <Badge 
          key={`diet-match-${diet}`}
          className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full"
        >
          <Check className="h-3 w-3 mr-1" />
          {diet}
        </Badge>
      ))}

      {/* Organic indicator */}
      {userPreferences.other_preferences?.organic && (
        <Badge 
          className={`text-xs px-2 py-0.5 rounded-full ${
            matchInfo.organicMatch 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Leaf className="h-3 w-3 mr-1" />
          {matchInfo.organicMatch ? 'Økologisk' : 'Ikke øko'}
        </Badge>
      )}

      {/* Animal welfare indicator */}
      {userPreferences.other_preferences?.animal_welfare && matchInfo.animalWelfareLevel !== 'unknown' && (
        <Badge 
          className={`text-xs px-2 py-0.5 rounded-full ${
            matchInfo.animalWelfareLevel === 'high' 
              ? 'bg-primary text-primary-foreground' 
              : matchInfo.animalWelfareLevel === 'medium'
                ? 'bg-yellow-500 text-white'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          <Heart className="h-3 w-3 mr-1" />
          {matchInfo.animalWelfareReason || (
            matchInfo.animalWelfareLevel === 'high' ? 'God dyrevelferd' :
            matchInfo.animalWelfareLevel === 'medium' ? 'Bedre dyrevelferd' :
            'Standard'
          )}
        </Badge>
      )}

      {/* Local food indicator */}
      {userPreferences.other_preferences?.local_food && (
        <Badge 
          className={`text-xs px-2 py-0.5 rounded-full ${
            matchInfo.localFoodMatch 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <MapPin className="h-3 w-3 mr-1" />
          {matchInfo.localFoodMatch 
            ? (matchInfo.localFoodReason || 'Norsk') 
            : 'Ikke norsk'}
        </Badge>
      )}
    </div>
  );
};

// Compact warning banner for when no safe alternatives exist
interface AllergyWarningBannerProps {
  allergyWarnings: string[];
}

export const AllergyWarningBanner = ({ allergyWarnings }: AllergyWarningBannerProps) => {
  if (allergyWarnings.length === 0) return null;
  
  return (
    <div className="bg-destructive/10 border-2 border-destructive/30 p-3 rounded-xl">
      <div className="flex items-start gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold">
            ⚠️ Obs: Ingen alternativer uten {allergyWarnings.join(', ')} funnet
          </p>
          <p className="text-xs mt-1 opacity-80">
            Alle produkter i denne kategorien inneholder allergener du har angitt
          </p>
        </div>
      </div>
    </div>
  );
};

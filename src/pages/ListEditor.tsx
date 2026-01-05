import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ShoppingList } from "@/components/ShoppingList";
import { StoreSelector } from "@/components/StoreSelector";
import { ShoppingMode } from "@/components/ShoppingMode";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList } from "@/hooks/useShoppingList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Step = "list" | "store" | "shopping";

const ListEditor = () => {
  const { listId } = useParams<{ listId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { lists, loading: listLoading, updateListStore, setActiveList } = useShoppingList(user?.id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("list");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const didInitFromQueryRef = useRef(false);

  const currentList = lists.find(l => l.id === listId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!listLoading && !currentList && listId) {
      // Liste ikke funnet, gå tilbake til dashboard
      navigate("/");
    }
  }, [currentList, listId, listLoading, navigate]);

  useEffect(() => {
    if (!currentList) return;

    setActiveList(currentList);

    const viewParam = searchParams.get('view');
    const storeParam = searchParams.get('store');

    // Only initialize from query params once (used when returning from product detail)
    if (!didInitFromQueryRef.current && viewParam === 'shopping' && storeParam) {
      didInitFromQueryRef.current = true;
      setSelectedStore(storeParam);
      setStep('shopping');
      return;
    }

    didInitFromQueryRef.current = true;

    // Default: use list's stored store_id, but don't override an explicit in-session selection
    if (currentList.store_id && !selectedStore) {
      setSelectedStore(currentList.store_id);
    }
  }, [currentList, searchParams, selectedStore, setActiveList]);


  const handleContinueToStore = async () => {
    setSearchParams({}, { replace: true });
    setStep("store");
  };

  const handleSelectStore = async (storeId: string) => {
    setSelectedStore(storeId);
    if (listId) {
      await updateListStore(listId, storeId);
    }
    setSearchParams({ view: "shopping", store: storeId }, { replace: true });
    setStep("shopping");
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  if (authLoading || listLoading || !currentList) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">Laster...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {step === "list" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToDashboard}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til oversikt
              </Button>
              <h1 className="text-2xl font-bold">{currentList.name}</h1>
            </div>
            <ShoppingList listId={currentList.id} onContinue={handleContinueToStore} />
          </div>
        )}
        {step === "store" && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Velg butikk</h1>
            <StoreSelector
              onSelectStore={handleSelectStore}
              onBack={() => {
                setSearchParams({}, { replace: true });
                setStep("list");
              }}
            />
          </div>
        )}
        {step === "shopping" && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Handlemodus</h1>
            <ShoppingMode
              key={selectedStore} // Force remount when store changes
              storeId={selectedStore}
              listId={currentList.id}
              onBack={() => {
                setSearchParams({}, { replace: true });
                setStep("store");
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default ListEditor;

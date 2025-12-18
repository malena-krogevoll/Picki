import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const searchParams = new URLSearchParams(window.location.search);
  const [step, setStep] = useState<Step>("list");
  const [selectedStore, setSelectedStore] = useState<string>("");

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
    if (currentList) {
      setActiveList(currentList);
      if (currentList.store_id) {
        setSelectedStore(currentList.store_id);
      }

      // Check if we should go directly to shopping mode (coming back from product detail)
      const viewParam = searchParams.get('view');
      const storeParam = searchParams.get('store');
      if (viewParam === 'shopping' && storeParam) {
        setSelectedStore(storeParam);
        setStep('shopping');
      }
    }
  }, [currentList]);

  const handleContinueToStore = async () => {
    setStep("store");
  };

  const handleSelectStore = async (storeId: string) => {
    setSelectedStore(storeId);
    if (listId) {
      await updateListStore(listId, storeId);
    }
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
            <StoreSelector onSelectStore={handleSelectStore} onBack={() => setStep("list")} />
          </div>
        )}
        {step === "shopping" && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Handlemodus</h1>
            <ShoppingMode
              key={selectedStore} // Force remount when store changes
              storeId={selectedStore}
              listId={currentList.id}
              onBack={() => setStep("store")}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default ListEditor;

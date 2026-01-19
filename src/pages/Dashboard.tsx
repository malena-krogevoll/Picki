import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SwipeableCard } from "@/components/SwipeableCard";
import { getStoreName } from "@/components/StoreSelectorDialog";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList } from "@/hooks/useShoppingList";
import TextInputShoppingList from "@/components/TextInputShoppingList";
import { ShoppingCart, Clock, Copy, ChevronRight, Package, UtensilsCrossed, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { lists, completedLists, loading: listLoading, duplicateList, deleteList, setActiveList, refetch } = useShoppingList(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleEditList = (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (list) {
      setActiveList(list);
      navigate(`/list/${listId}`);
    }
  };

  const handleDuplicateList = async (listId: string) => {
    const result = await duplicateList(listId);
    if (result?.data) {
      navigate(`/list/${result.data.id}`);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (window.confirm("Er du sikker på at du vil slette denne listen?")) {
      await deleteList(listId);
    }
  };

  const handleListCreated = () => {
    refetch();
  };

  if (authLoading || listLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
          <div className="text-center">Laster...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-4xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">Mine handlelister</h1>
            <p className="text-sm md:text-base text-muted-foreground">Administrer dine handlelister</p>
          </div>

          {/* Text input for creating new shopping list */}
          <TextInputShoppingList onListCreated={handleListCreated} />

          {/* Quick action for dinner explorer */}
          <Card 
            className="border-2 border-dashed border-secondary/30 bg-secondary/5 hover:border-secondary/50 transition-colors cursor-pointer" 
            onClick={() => navigate("/dinner-explorer")}
          >
            <CardContent className="flex items-center justify-center py-6 md:py-8 px-4">
              <div className="flex items-center gap-4">
                <div className="bg-secondary/10 w-12 h-12 rounded-full flex items-center justify-center">
                  <UtensilsCrossed className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Middager</h3>
                  <p className="text-sm text-muted-foreground">Oppskrifter med renvarer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktive handlelister */}
          {lists.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Aktive lister
              </h2>
              <p className="text-xs text-muted-foreground md:hidden">Sveip til venstre for å slette</p>
              <div className="grid gap-3 md:gap-4">
                {lists.map((list) => (
                  <SwipeableCard key={list.id} onDelete={() => handleDeleteList(list.id)}>
                    <Card
                      className="border-2 border-border hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => handleEditList(list.id)}
                    >
                      <CardHeader className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base md:text-xl group-hover:text-primary transition-colors truncate">
                              {list.name}
                            </CardTitle>
                            <CardDescription className="mt-1 md:mt-2 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                              <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="truncate">{format(new Date(list.created_at), "d. MMM", { locale: nb })}</span>
                            </CardDescription>
                          </div>
                          <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-4">
                            <Badge variant="secondary" className="rounded-full text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              {list.items?.length || 0}
                            </Badge>
                            {list.store_id && (
                              <Badge variant="outline" className="rounded-full text-xs">
                                {getStoreName(list.store_id)}
                              </Badge>
                            )}
                          </div>
                          <div className="hidden md:flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateList(list.id);
                              }}
                              className="rounded-full"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteList(list.id);
                              }}
                              className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SwipeableCard>
                ))}
              </div>
            </div>
          )}

          {/* Fullførte handlelister */}
          {completedLists.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Fullførte lister
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">Gjenbruk som mal</p>
              <div className="grid gap-3 md:gap-4">
                {completedLists.map((list) => (
                  <SwipeableCard key={list.id} onDelete={() => handleDeleteList(list.id)}>
                    <Card
                      className="border-2 border-border hover:border-primary/30 transition-all opacity-80 hover:opacity-100"
                    >
                      <CardHeader className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base md:text-xl text-muted-foreground truncate">
                              {list.name}
                            </CardTitle>
                            <CardDescription className="mt-1 md:mt-2 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                              <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="truncate">
                                {list.completed_at && format(new Date(list.completed_at), "d. MMM", { locale: nb })}
                              </span>
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full text-xs flex-shrink-0">
                            Fullført
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-4">
                            <Badge variant="secondary" className="rounded-full text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              {list.items?.length || 0}
                            </Badge>
                            {list.store_id && (
                              <Badge variant="outline" className="rounded-full text-xs">
                                {getStoreName(list.store_id)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicateList(list.id)}
                              className="rounded-full text-xs md:text-sm h-8 md:h-9 px-2 md:px-4"
                            >
                              <Copy className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                              <span className="hidden md:inline">Gjenbruk</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteList(list.id);
                              }}
                              className="hidden md:flex rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SwipeableCard>
                ))}
              </div>
            </div>
          )}

          {lists.length === 0 && completedLists.length === 0 && (
            <Card className="border-2 border-border">
              <CardContent className="py-8 md:py-12 text-center">
                <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm md:text-base">Du har ingen handlelister ennå</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">Bruk tekstfeltet over til å opprette din første handleliste</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

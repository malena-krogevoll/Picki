import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList } from "@/hooks/useShoppingList";
import { Plus, ShoppingCart, Clock, Copy, ChevronRight, Package, UtensilsCrossed, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { lists, completedLists, loading: listLoading, createList, duplicateList, deleteList, setActiveList } = useShoppingList(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleCreateNewList = async () => {
    const result = await createList("Min handleliste");
    if (result?.data) {
      navigate(`/list/${result.data.id}`);
    }
  };

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

  if (authLoading || listLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">Laster...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Mine handlelister</h1>
            <p className="text-muted-foreground">Administrer dine handlelister og gjenbruk tidligere lister</p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors cursor-pointer" onClick={handleCreateNewList}>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Opprett ny handleliste</h3>
                  <p className="text-sm text-muted-foreground">Start en ny liste for din neste handletur</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-secondary/30 bg-secondary/5 hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => navigate("/dinner-explorer")}>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UtensilsCrossed className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Middag-explorer</h3>
                  <p className="text-sm text-muted-foreground">Oppskrifter med renvarer</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aktive handlelister */}
          {lists.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Aktive lister
              </h2>
              <div className="grid gap-4">
                {lists.map((list) => (
                  <Card
                    key={list.id}
                    className="border-2 border-border hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => handleEditList(list.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {list.name}
                          </CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            Opprettet {format(new Date(list.created_at), "d. MMMM yyyy", { locale: nb })}
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="rounded-full">
                            <Package className="h-3 w-3 mr-1" />
                            {list.items?.length || 0} varer
                          </Badge>
                          {list.store_id && (
                            <Badge variant="outline" className="rounded-full">
                              {list.store_id.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
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
                ))}
              </div>
            </div>
          )}

          {/* Fullførte handlelister */}
          {completedLists.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                Nylig fullførte lister
              </h2>
              <p className="text-sm text-muted-foreground">Gjenbruk tidligere lister som mal</p>
              <div className="grid gap-4">
                {completedLists.map((list) => (
                  <Card
                    key={list.id}
                    className="border-2 border-border hover:border-primary/30 transition-all opacity-80 hover:opacity-100"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl text-muted-foreground">
                            {list.name}
                          </CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            Fullført {list.completed_at && format(new Date(list.completed_at), "d. MMMM yyyy", { locale: nb })}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full">
                          Fullført
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="rounded-full">
                            <Package className="h-3 w-3 mr-1" />
                            {list.items?.length || 0} varer
                          </Badge>
                          {list.store_id && (
                            <Badge variant="outline" className="rounded-full">
                              {list.store_id.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateList(list.id)}
                            className="rounded-full"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Gjenbruk som mal
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
                ))}
              </div>
            </div>
          )}

          {lists.length === 0 && completedLists.length === 0 && (
            <Card className="border-2 border-border">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Du har ingen handlelister ennå</p>
                <p className="text-sm text-muted-foreground mt-2">Opprett din første handleliste for å komme i gang</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

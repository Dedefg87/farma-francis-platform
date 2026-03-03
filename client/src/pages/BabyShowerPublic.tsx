className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Seu Nome *"
                    value={guestData.name}
                    onChange={(e) => setGuestData({ ...guestData, name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="WhatsApp"
                    value={guestData.phone}
                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                  />
                  <Input
                    placeholder="E-mail"
                    type="email"
                    value={guestData.email}
                    onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                  />
                </div>
                <textarea
                  placeholder="Deixe uma mensagem carinhosa para os pais..."
                  className="w-full p-3 border rounded-lg resize-none h-24"
                  value={guestData.message}
                  onChange={(e) => setGuestData({ ...guestData, message: e.target.value })}
                />
                <Button
                  className="w-full bg-pink-500 hover:bg-pink-600 h-12 text-lg"
                  onClick={handlePurchase}
                  disabled={purchaseMutation.isPending || !guestData.name}
                >
                  {purchaseMutation.isPending ? "Processando..." : `Presentear com R$ ${selectedPackage.price}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              Obrigado pelo presente!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Sua contribuição para o Chá de Bebê foi registrada.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Efetue o pagamento via PIX:</p>
              <p className="font-mono text-xs break-all bg-white p-2 rounded">
                farmafrancis{purchaseId}@pix.farmafrancis.com
              </p>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={copyPixCode}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Código PIX
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Após o pagamento, os pais receberão a confirmação automaticamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

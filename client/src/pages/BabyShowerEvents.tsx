          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {event.event.targetAmount && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Meta: R$ {event.event.targetAmount}</span>
              <span className="text-pink-600 font-medium">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-full bg-pink-500 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="font-bold text-blue-600">{event.event.totalGuests}</p>
            <p className="text-xs text-gray-500">Convidados</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="font-bold text-green-600">
              R$ {parseFloat(event.event.walletBalance || 0).toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">Arrecadado</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="font-bold text-orange-600">{event.event.availableDiapersCount}</p>
            <p className="text-xs text-gray-500">Disponível</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Código: {event.event.eventCode}</p>
      </CardContent>
    </Card>
  );
}

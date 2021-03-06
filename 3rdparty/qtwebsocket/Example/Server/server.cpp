#include "ServerExample.h"

#include "Log.h"

ServerExample::ServerExample()
{
        int port = 1337;
    server = new QWsServer(this);
        if ( ! server->listen(QHostAddress::Any, port) )
        {
                Log::display( "Error: Can't launch server" );
                QMessageBox::critical(0, "QWsServer error", server->errorString());
        }
        else
        {
                Log::display( "Server is listening port " + QString::number(port) );
        }
        connect(server, SIGNAL(newConnection()), this, SLOT(onClientConnection()));
}

ServerExample::~ServerExample()
{
}

void ServerExample::onClientConnection()
{
        QWsSocket * clientSocket = server->nextPendingConnection();

        QObject * clientObject = qobject_cast<QObject*>(clientSocket);

        connect(clientObject, SIGNAL(frameReceived(QString)), this, SLOT(onDataReceived(QString)));
        connect(clientObject, SIGNAL(disconnected()), this, SLOT(onClientDisconnection()));
        connect(clientObject, SIGNAL(pong(quint64)), this, SLOT(onPong(quint64)));

        clients << clientSocket;

        Log::display("Client connected");
}

void ServerExample::onDataReceived(QString data) {

    QWsSocket *socket = qobject_cast<QWsSocket *>(sender());
    if (socket == 0) {
        return;
    }

    qDebug() << data;

    QWsSocket * client;
    foreach ( client, clients )
    {
        client->write( data );
    }
}

void ServerExample::onPong(quint64 elapsedTime) {

    Log::display("ping: " + QString::number(elapsedTime) + " ms" );
}

void ServerExample::onClientDisconnection() {

    QWsSocket *socket = qobject_cast<QWsSocket*>(sender());
    if (socket == 0) {
        return;
    }

    clients.removeOne(socket);

    socket->deleteLater();

    qDebug() << "Client disconnected";
}

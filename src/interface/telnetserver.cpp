#include "telnetserver.h"

#include <QCoreApplication>
#include <QDebug>
#include <QTcpServer>
#include <QTcpSocket>

#include "session.h"
#include "engine/player.h"


TelnetServer::TelnetServer(quint16 port, QObject *parent) :
    QObject(parent) {

    m_server = new QTcpServer(this);
    if (!m_server->listen(QHostAddress::Any, port)) {
        qDebug() << "Error: Can't launch telnet server";
    } else {
        qDebug() << "Telnet server is listening on port " + QString::number(port);
    }

    connect(m_server, SIGNAL(newConnection()), this, SLOT(onClientConnected()));
}

TelnetServer::~TelnetServer() {
}

void TelnetServer::onClientConnected() {

    QTcpSocket *socket = m_server->nextPendingConnection();
    connect(socket, SIGNAL(readyRead()), SLOT(onReadyRead()));
    connect(socket, SIGNAL(disconnected()), SLOT(onClientDisconnected()));

    Session *session = new Session(socket);
    connect(session, SIGNAL(write(QString)), SLOT(onSessionOutput(QString)));
    connect(session, SIGNAL(terminate()), socket, SLOT(deleteLater()));

    session->open();

    socket->setProperty("session", QVariant::fromValue(session));
    m_clients << socket;
}

void TelnetServer::onReadyRead() {

    QTcpSocket *socket = qobject_cast<QTcpSocket *>(sender());
    if (socket == 0) {
        return;
    }

    QByteArray buffer = socket->property("buffer").toByteArray();
    buffer.append(socket->readAll());

    int index;
    while ((index = buffer.indexOf("\r\n")) > -1) {
        QByteArray line = buffer.left(index);

        Session *session = socket->property("session").value<Session *>();
        Q_ASSERT(session);
        session->onUserInput(line);

        buffer.remove(0, index + 2);
    }

    socket->setProperty("buffer", buffer);
}

void TelnetServer::onClientDisconnected() {

    QTcpSocket *socket = qobject_cast<QTcpSocket *>(sender());
    if (socket == 0) {
        return;
    }

    m_clients.removeOne(socket);

    socket->deleteLater();
}

void TelnetServer::onSessionOutput(QString data) {

    if (data.trimmed().isEmpty()) {
        return;
    }

    Session *session = qobject_cast<Session *>(sender());
    if (session == 0) {
        return;
    }

    QTcpSocket *socket = qobject_cast<QTcpSocket *>(session->parent());
    if (socket == 0) {
        return;
    }

    socket->write(data.replace("\n", "\r\n").toUtf8());

    if (session->authenticated()) {
        Player *player = session->player();
        Q_ASSERT(player);

        socket->write(QString("(%1H) ").arg(player->hp()).toUtf8());
    }
}
